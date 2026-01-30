import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { MoodEntry, CBTLog, MoodRating, CognitiveDistortion } from '@/types';
import { format } from 'date-fns';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface MoodRow {
  id: string;
  rating: number;
  emotions: string;
  note: string | null;
  trigger: string | null;
  behavior: string | null;
  timestamp: number;
  user_id: string;
}

interface CBTRow {
  id: string;
  timestamp: number;
  situation: string;
  automatic_thoughts: string;
  distortions: string;
  rational_response: string;
  mood_before: number;
  mood_after: number | null;
  behavioral_link: string | null;
  user_id: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileFormat = searchParams.get('format') || 'json';
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const isRbacEnabled = process.env.ENABLE_RBAC === 'true';
  let userId = '1';

  if (isRbacEnabled) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = (session.user as { id: string }).id;
  }

  try {
    // 1. Fetch Data
    let moodQuery = 'SELECT * FROM mood_entries';
    let cbtQuery = 'SELECT * FROM cbt_logs';
    const params: (string | number)[] = [];

    if (isRbacEnabled) {
      moodQuery += ' WHERE user_id = ?';
      cbtQuery += ' WHERE user_id = ?';
      params.push(userId);
      
      if (start && end) {
        moodQuery += ' AND timestamp BETWEEN ? AND ?';
        cbtQuery += ' AND timestamp BETWEEN ? AND ?';
        params.push(parseInt(start), parseInt(end));
      }
    } else {
      if (start && end) {
        moodQuery += ' WHERE timestamp BETWEEN ? AND ?';
        cbtQuery += ' WHERE timestamp BETWEEN ? AND ?';
        params.push(parseInt(start), parseInt(end));
      }
    }

    moodQuery += ' ORDER BY timestamp DESC';
    cbtQuery += ' ORDER BY timestamp DESC';

    const moodRows = db.prepare(moodQuery).all(...params) as MoodRow[];
    const cbtRows = db.prepare(cbtQuery).all(...params) as CBTRow[];

    const moodEntries: MoodEntry[] = moodRows.map(r => ({
      ...r,
      rating: r.rating as MoodRating,
      note: r.note || undefined,
      trigger: r.trigger || undefined,
      behavior: r.behavior || undefined,
      emotions: JSON.parse(r.emotions),
      userId: r.user_id
    }));

    const cbtLogs: CBTLog[] = cbtRows.map(r => ({
      ...r,
      automaticThoughts: r.automatic_thoughts,
      rationalResponse: r.rational_response,
      moodBefore: r.mood_before as MoodRating,
      moodAfter: (r.mood_after as MoodRating) || undefined,
      behavioralLink: r.behavioral_link || undefined,
      distortions: JSON.parse(r.distortions) as CognitiveDistortion[],
      userId: r.user_id
    }));

    // 2. Format Data
    if (fileFormat === 'csv') {
      const csv = formatCsv(moodEntries, cbtLogs);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="mindfultrack_export_${Date.now()}.csv"`
        }
      });
    }

    if (fileFormat === 'md') {
      const md = formatMarkdown(moodEntries, cbtLogs);
      return new NextResponse(md, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="mindfultrack_export_${Date.now()}.md"`
        }
      });
    }

    // Default JSON
    const json = JSON.stringify({ moodEntries, cbtLogs }, null, 2);
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="mindfultrack_export_${Date.now()}.json"`
      }
    });

  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function formatCsv(moodEntries: MoodEntry[], cbtLogs: CBTLog[]) {
  const moodHeaders = 'Type,ID,Timestamp,Date,Rating,Emotions,Note,Trigger,Behavior\n';
  const moodRows = moodEntries.map(e => {
    const note = e.note ? e.note.split('"').join('""') : '';
    return `Mood,${e.id},${e.timestamp},"${format(e.timestamp, 'yyyy-MM-dd HH:mm')}",${e.rating},"${e.emotions.join('|')}","${note}","${e.trigger || ''}","${e.behavior || ''}"`;
  }).join('\n');

  const cbtHeaders = '\nType,ID,Timestamp,Date,Situation,AutomaticThoughts,Distortions,RationalResponse,MoodBefore,MoodAfter,BehavioralLink\n';
  const cbtRows = cbtLogs.map(l => {
    const situation = l.situation.split('"').join('""');
    const autoThoughts = l.automaticThoughts.split('"').join('""');
    const rationalResp = l.rationalResponse.split('"').join('""');
    const behavioralLink = l.behavioralLink ? l.behavioralLink.split('"').join('""') : '';
    
    return `CBT,${l.id},${l.timestamp},"${format(l.timestamp, 'yyyy-MM-dd HH:mm')}",` + 
      `"${situation}","${autoThoughts}","${l.distortions.join('|')}",` + 
      `"${rationalResp}",${l.moodBefore},${l.moodAfter || ''},"${behavioralLink}"`;
  }).join('\n');

  return moodHeaders + moodRows + cbtHeaders + cbtRows;
}

function formatMarkdown(moodEntries: MoodEntry[], cbtLogs: CBTLog[]) {
  let md = '# MindfulTrack Data Export\n\n';
  md += `Exported on: ${new Date().toLocaleString()}\n\n`;

  md += '## Mood Entries\n\n';
  if (moodEntries.length === 0) md += 'No mood entries found.\n\n';
  moodEntries.forEach(e => {
    md += `### ${format(e.timestamp, 'PPP p')}\n`;
    md += `- **Rating**: ${e.rating}/10\n`;
    md += `- **Emotions**: ${e.emotions.join(', ')}\n`;
    if (e.trigger) md += `- **Trigger**: ${e.trigger}\n`;
    if (e.behavior) md += `- **Behavior**: ${e.behavior}\n`;
    if (e.note) md += `- **Note**: ${e.note}\n`;
    md += '\n';
  });

  md += '## CBT Journal Logs\n\n';
  if (cbtLogs.length === 0) md += 'No CBT logs found.\n\n';
  cbtLogs.forEach(l => {
    md += `### ${format(l.timestamp, 'PPP p')}\n`;
    md += `- **Situation**: ${l.situation}\n`;
    md += `- **Automatic Thoughts**: ${l.automaticThoughts}\n`;
    md += `- **Distortions**: ${l.distortions.join(', ')}\n`;
    md += `- **Rational Response**: ${l.rationalResponse}\n`;
    md += `- **Mood**: ${l.moodBefore} → ${l.moodAfter || 'N/A'}\n`;
    if (l.behavioralLink) md += `- **Behavioral Link**: ${l.behavioralLink}\n`;
    md += '\n';
  });

  return md;
}
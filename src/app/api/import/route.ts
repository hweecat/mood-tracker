import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { MoodEntry, CBTLog, MoodRating, CognitiveDistortion } from '@/types';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
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
    const body = await request.json();
    const { format, content } = body as { format: string, content: string };

    console.log(`Received import request with format: ${format}`);

    let moodEntries: MoodEntry[] = [];
    let cbtLogs: CBTLog[] = [];

    if (format === 'json') {
      try {
        const data = JSON.parse(content);
        moodEntries = data.moodEntries || [];
        cbtLogs = data.cbtLogs || [];
      } catch (e: unknown) {
        throw new Error(`Invalid JSON format`);
      }
    } else if (format === 'csv') {
      const parsed = parseCsv(content);
      moodEntries = parsed.moodEntries;
      cbtLogs = parsed.cbtLogs;
    } else if (format === 'md') {
      const parsed = parseMarkdown(content);
      moodEntries = parsed.moodEntries;
      cbtLogs = parsed.cbtLogs;
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    if (moodEntries.length === 0 && cbtLogs.length === 0) {
      return NextResponse.json({ error: 'No valid data found to import.' }, { status: 400 });
    }

    const importTransaction = db.transaction(() => {
      const moodStmt = db.prepare(`
        INSERT OR REPLACE INTO mood_entries (id, rating, emotions, note, trigger, behavior, timestamp, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const e of moodEntries) {
        if (!e.id || typeof e.rating !== 'number') continue;
        moodStmt.run(
          e.id, 
          e.rating, 
          JSON.stringify(e.emotions || []),
          e.note || null, 
          e.trigger || null, 
          e.behavior || null, 
          e.timestamp || Date.now(),
          userId
        );
      }

      const cbtStmt = db.prepare(`
        INSERT OR REPLACE INTO cbt_logs (
          id, timestamp, situation, automatic_thoughts, distortions, 
          rational_response, mood_before, mood_after, behavioral_link, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const l of cbtLogs) {
        if (!l.id || !l.situation) continue;
        cbtStmt.run(
          l.id,
          l.timestamp || Date.now(),
          l.situation,
          l.automaticThoughts,
          JSON.stringify(l.distortions || []),
          l.rationalResponse,
          l.moodBefore,
          l.moodAfter || null,
          l.behavioralLink || null,
          userId
        );
      }
    });

    importTransaction();

    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${moodEntries.length} mood entries and ${cbtLogs.length} CBT logs.` 
    });

  } catch (error: unknown) {
    console.error('Import failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during import.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function parseCsv(csv: string) {
  const lines = csv.split('\n');
  const moodEntries: MoodEntry[] = [];
  const cbtLogs: CBTLog[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i+1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    const type = parts[0];
    if (type === 'Mood') {
      moodEntries.push({
        id: parts[1],
        userId: '',
        timestamp: parseInt(parts[2]),
        rating: parseInt(parts[4]) as MoodRating,
        emotions: parts[5] ? parts[5].split('|') : [],
        note: parts[6] || undefined,
        trigger: parts[7] || undefined,
        behavior: parts[8] || undefined
      });
    } else if (type === 'CBT') {
      cbtLogs.push({
        id: parts[1],
        userId: '',
        timestamp: parseInt(parts[2]),
        situation: parts[4],
        automaticThoughts: parts[5],
        distortions: parts[6] ? parts[6].split('|') as CognitiveDistortion[] : [],
        rationalResponse: parts[7],
        moodBefore: parseInt(parts[8]) as MoodRating,
        moodAfter: parts[9] ? parseInt(parts[9]) as MoodRating : undefined,
        behavioralLink: parts[10] || undefined
      });
    }
  }

  return { moodEntries, cbtLogs };
}

function parseMarkdown(md: string) {
  const moodEntries: MoodEntry[] = [];
  const cbtLogs: CBTLog[] = [];

  const moodSection = md.split('## Mood Entries')[1]?.split('## CBT Journal Logs')[0] || '';
  const cbtSection = md.split('## CBT Journal Logs')[1] || '';

  const moodBlocks = moodSection.split('### ').slice(1);
  for (const block of moodBlocks) {
    const lines = block.split('\n');
    const entry: Partial<MoodEntry> = {
      id: crypto.randomUUID(),
      userId: '',
      timestamp: Date.now(),
      emotions: []
    };

    for (const line of lines) {
      if (line.startsWith('- **Rating**')) entry.rating = parseInt(line.split(': ')[1]) as MoodRating;
      if (line.startsWith('- **Emotions**')) entry.emotions = line.split(': ')[1].split(', ');
      if (line.startsWith('- **Trigger**')) entry.trigger = line.split(': ')[1];
      if (line.startsWith('- **Behavior**')) entry.behavior = line.split(': ')[1];
      if (line.startsWith('- **Note**')) entry.note = line.split(': ')[1];
    }
    if (entry.rating) moodEntries.push(entry as MoodEntry);
  }

  const cbtBlocks = cbtSection.split('### ').slice(1);
  for (const block of cbtBlocks) {
    const lines = block.split('\n');
    const log: Partial<CBTLog> = {
      id: crypto.randomUUID(),
      userId: '',
      timestamp: Date.now(),
      distortions: []
    };

    for (const line of lines) {
      if (line.startsWith('- **Situation**')) log.situation = line.split(': ')[1];
      if (line.startsWith('- **Automatic Thoughts**')) log.automaticThoughts = line.split(': ')[1];
      if (line.startsWith('- **Distortions**')) log.distortions = line.split(': ')[1].split(', ') as CognitiveDistortion[];
      if (line.startsWith('- **Rational Response**')) log.rationalResponse = line.split(': ')[1];
      if (line.startsWith('- **Mood**')) {
        const moods = line.split(': ')[1].split(' → ');
        log.moodBefore = parseInt(moods[0]) as MoodRating;
        if (moods[1] !== 'N/A') log.moodAfter = parseInt(moods[1]) as MoodRating;
      }
      if (line.startsWith('- **Behavioral Link**')) log.behavioralLink = line.split(': ')[1];
    }
    if (log.situation) cbtLogs.push(log as CBTLog);
  }

  return { moodEntries, cbtLogs };
}

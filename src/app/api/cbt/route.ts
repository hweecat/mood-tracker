import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const CBTLogSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  situation: z.string(),
  automaticThoughts: z.string(),
  distortions: z.array(z.string()),
  rationalResponse: z.string(),
  moodBefore: z.number().min(1).max(10),
  moodAfter: z.number().min(1).max(10).nullable().optional(),
  behavioralLink: z.string().nullable().optional(),
});

interface CBTLogRow {
  id: string;
  timestamp: number;
  situation: string;
  automaticThoughts: string;
  distortions: string;
  rationalResponse: string;
  moodBefore: number;
  moodAfter: number | null;
  behavioralLink: string | null;
  user_id: string;
}

export async function GET() {
  const isRbacEnabled = process.env.ENABLE_RBAC === 'true';
  let userId = '1';

  if (isRbacEnabled) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
        userId = (session.user as { id: string }).id;
  }

  let stmt;
  let rows;

  if (isRbacEnabled) {
    stmt = db.prepare(`
      SELECT 
        id, 
        timestamp, 
        situation, 
        automatic_thoughts as automaticThoughts, 
        distortions, 
        rational_response as rationalResponse, 
        mood_before as moodBefore, 
        mood_after as moodAfter,
        behavioral_link as behavioralLink,
        user_id
      FROM cbt_logs 
      WHERE user_id = ?
      ORDER BY timestamp DESC
    `);
    rows = stmt.all(userId) as CBTLogRow[];
  } else {
    stmt = db.prepare(`
      SELECT 
        id, 
        timestamp, 
        situation, 
        automatic_thoughts as automaticThoughts, 
        distortions, 
        rational_response as rationalResponse, 
        mood_before as moodBefore, 
        mood_after as moodAfter,
        behavioral_link as behavioralLink,
        user_id
      FROM cbt_logs 
      ORDER BY timestamp DESC
    `);
    rows = stmt.all() as CBTLogRow[];
  }
  
  const cbtLogs = rows.map(row => ({
    ...row,
    distortions: JSON.parse(row.distortions),
    userId: row.user_id
  }));

  return NextResponse.json(cbtLogs);
}

export async function POST(request: Request) {
  try {
    let userId = '1';
    
    const isRbacEnabled = process.env.ENABLE_RBAC === 'true';
    if (isRbacEnabled) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
              userId = (session.user as { id: string }).id;
        }
    const body = await request.json();
    const validatedData = CBTLogSchema.parse(body);
    const { 
      id, 
      situation, 
      automaticThoughts, 
      distortions, 
      rationalResponse, 
      moodBefore, 
      moodAfter, 
      behavioralLink,
      timestamp 
    } = validatedData;

    const stmt = db.prepare(`
      INSERT INTO cbt_logs (
        id, 
        timestamp, 
        situation, 
        automatic_thoughts, 
        distortions, 
        rational_response, 
        mood_before, 
        mood_after,
        behavioral_link,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, 
      timestamp, 
      situation, 
      automaticThoughts, 
      JSON.stringify(distortions), 
      rationalResponse, 
      moodBefore, 
      moodAfter || null,
      behavioralLink || null,
      userId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    let userId = '1';
    const isRbacEnabled = process.env.ENABLE_RBAC === 'true';
    if (isRbacEnabled) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
          userId = (session.user as { id: string }).id;
    }

    const body = await request.json();
    const validatedData = CBTLogSchema.parse(body);
    const { 
      id, 
      situation, 
      automaticThoughts, 
      distortions, 
      rationalResponse, 
      moodBefore, 
      moodAfter, 
      behavioralLink,
      timestamp 
    } = validatedData;

    let stmt;
    let result;

    if (isRbacEnabled) {
      stmt = db.prepare(`
        UPDATE cbt_logs 
        SET 
          situation = ?, 
          automatic_thoughts = ?, 
          distortions = ?, 
          rational_response = ?, 
          mood_before = ?, 
          mood_after = ?, 
          behavioral_link = ?,
          timestamp = ?
        WHERE id = ? AND user_id = ?
      `);
      result = stmt.run(
        situation, 
        automaticThoughts, 
        JSON.stringify(distortions), 
        rationalResponse, 
        moodBefore, 
        moodAfter || null, 
        behavioralLink || null,
        timestamp,
        id, 
        userId
      );
    } else {
      stmt = db.prepare(`
        UPDATE cbt_logs 
        SET 
          situation = ?, 
          automatic_thoughts = ?, 
          distortions = ?, 
          rational_response = ?, 
          mood_before = ?, 
          mood_after = ?, 
          behavioral_link = ?,
          timestamp = ?
        WHERE id = ?
      `);
      result = stmt.run(
        situation, 
        automaticThoughts, 
        JSON.stringify(distortions), 
        rationalResponse, 
        moodBefore, 
        moodAfter || null, 
        behavioralLink || null,
        timestamp,
        id
      );
    }

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    let userId = '1';
    const isRbacEnabled = process.env.ENABLE_RBAC === 'true';
    if (isRbacEnabled) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
              userId = (session.user as { id: string }).id;
        }
    let stmt;
    let result;

    if (isRbacEnabled) {
      stmt = db.prepare('DELETE FROM cbt_logs WHERE id = ? AND user_id = ?');
      result = stmt.run(id, userId);
    } else {
      stmt = db.prepare('DELETE FROM cbt_logs WHERE id = ?');
      result = stmt.run(id);
    }

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
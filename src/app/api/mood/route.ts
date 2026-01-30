import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MoodEntrySchema = z.object({
  id: z.string(),
  rating: z.number().min(1).max(10),
  emotions: z.array(z.string()),
  note: z.string().nullable().optional(),
  trigger: z.string().nullable().optional(),
  behavior: z.string().nullable().optional(),
  timestamp: z.number(),
});

interface MoodEntryRow {
  id: string;
  rating: number;
  emotions: string;
  note: string | null;
  trigger: string | null;
  behavior: string | null;
  timestamp: number;
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
                }  // If RBAC is disabled, we currently fetch all entries (or default user's entries?)
  // The original code fetched ALL entries: `SELECT * FROM mood_entries`.
  // To preserve "feature flag" behavior:
  // If RBAC is enabled -> filter by user.
  // If RBAC is disabled -> fetch ALL (as before).
  
  let stmt;
  let rows;

  if (isRbacEnabled) {
    stmt = db.prepare('SELECT * FROM mood_entries WHERE user_id = ? ORDER BY timestamp DESC');
    rows = stmt.all(userId) as MoodEntryRow[];
  } else {
    stmt = db.prepare('SELECT * FROM mood_entries ORDER BY timestamp DESC');
    rows = stmt.all() as MoodEntryRow[];
  }
  
  const moodEntries = rows.map(row => ({
    ...row,
    emotions: JSON.parse(row.emotions),
    userId: row.user_id // Map DB column to API field
  }));

  return NextResponse.json(moodEntries);
}

export async function POST(request: Request) {
  try {
    const isRbacEnabled = process.env.ENABLE_RBAC === 'true';
    let userId = '1';

    if (isRbacEnabled) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
                    userId = (session.user as { id: string }).id;
                  }    const body = await request.json();
    const validatedData = MoodEntrySchema.parse(body);
    const { id, rating, emotions, note, trigger, behavior, timestamp } = validatedData;

    const stmt = db.prepare('INSERT INTO mood_entries (id, rating, emotions, note, trigger, behavior, timestamp, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, rating, JSON.stringify(emotions), note || null, trigger || null, behavior || null, timestamp, userId);

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

    const isRbacEnabled = process.env.ENABLE_RBAC === 'true';
    let userId = '1';
    if (isRbacEnabled) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
                    userId = (session.user as { id: string }).id;
                  }    let stmt;
    let result;

    if (isRbacEnabled) {
      stmt = db.prepare('DELETE FROM mood_entries WHERE id = ? AND user_id = ?');
      result = stmt.run(id, userId);
    } else {
      stmt = db.prepare('DELETE FROM mood_entries WHERE id = ?');
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
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getAuthContext, apiError, apiSuccess } from '@/lib/api-utils';

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
  try {
    const auth = await getAuthContext();
    if (!auth.authorized) {
      return apiError('Unauthorized', 401);
    }

    let rows: CBTLogRow[];
    const selectQuery = `
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
    `;

    if (auth.rbac) {
      rows = db.prepare(`${selectQuery} WHERE user_id = ? ORDER BY timestamp DESC`).all(auth.userId) as CBTLogRow[];
    } else {
      rows = db.prepare(`${selectQuery} ORDER BY timestamp DESC`).all() as CBTLogRow[];
    }
    
    const cbtLogs = rows.map(row => ({
      ...row,
      distortions: JSON.parse(row.distortions),
      userId: row.user_id
    }));

    return apiSuccess(cbtLogs);
  } catch (error) {
    console.error('GET /api/cbt Error:', error);
    return apiError('Internal Server Error');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.authorized) {
      return apiError('Unauthorized', 401);
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
      auth.userId
    );

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Invalid input', 400, error.issues);
    }
    return apiError('Internal Server Error');
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth.authorized) {
      return apiError('Unauthorized', 401);
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

    let result;
    const updateQuery = `
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
    `;

    if (auth.rbac) {
      result = db.prepare(`${updateQuery} WHERE id = ? AND user_id = ?`).run(
        situation, 
        automaticThoughts, 
        JSON.stringify(distortions), 
        rationalResponse, 
        moodBefore, 
        moodAfter || null, 
        behavioralLink || null,
        timestamp,
        id, 
        auth.userId
      );
    } else {
      result = db.prepare(`${updateQuery} WHERE id = ?`).run(
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
      return apiError('Entry not found', 404);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Invalid input', 400, error.issues);
    }
    return apiError('Internal Server Error');
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID is required', 400);
    }

    const auth = await getAuthContext();
    if (!auth.authorized) {
      return apiError('Unauthorized', 401);
    }

    let result;
    if (auth.rbac) {
      result = db.prepare('DELETE FROM cbt_logs WHERE id = ? AND user_id = ?').run(id, auth.userId);
    } else {
      result = db.prepare('DELETE FROM cbt_logs WHERE id = ?').run(id);
    }

    if (result.changes === 0) {
      return apiError('Entry not found', 404);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    return apiError('Internal Server Error');
  }
}
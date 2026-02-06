import db from '@/lib/db';
import { z } from 'zod';
import { getAuthContext, apiError, apiSuccess } from '@/lib/api-utils';

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
  try {
    const auth = await getAuthContext();
    if (!auth.authorized) {
      return apiError('Unauthorized', 401);
    }

    let rows: MoodEntryRow[];
    if (auth.rbac) {
      rows = db.prepare('SELECT * FROM mood_entries WHERE user_id = ? ORDER BY timestamp DESC').all(auth.userId) as MoodEntryRow[];
    } else {
      rows = db.prepare('SELECT * FROM mood_entries ORDER BY timestamp DESC').all() as MoodEntryRow[];
    }
    
    const moodEntries = rows.map(row => ({
      ...row,
      emotions: JSON.parse(row.emotions),
      userId: row.user_id
    }));

    return apiSuccess(moodEntries);
  } catch (error) {
    console.error('GET /api/mood Error:', error);
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
    const validatedData = MoodEntrySchema.parse(body);
    const { id, rating, emotions, note, trigger, behavior, timestamp } = validatedData;

    const stmt = db.prepare('INSERT INTO mood_entries (id, rating, emotions, note, trigger, behavior, timestamp, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, rating, JSON.stringify(emotions), note || null, trigger || null, behavior || null, timestamp, auth.userId);

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
      result = db.prepare('DELETE FROM mood_entries WHERE id = ? AND user_id = ?').run(id, auth.userId);
    } else {
      result = db.prepare('DELETE FROM mood_entries WHERE id = ?').run(id);
    }

    if (result.changes === 0) {
      return apiError('Entry not found', 404);
    }

    return apiSuccess({ success: true });
  } catch (error) {
    console.error('DELETE /api/mood Error:', error);
    return apiError('Internal Server Error');
  }
}
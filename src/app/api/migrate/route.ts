import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// This endpoint should only be used once and then removed
export async function POST() {
  const isRbacEnabled = process.env.ENABLE_RBAC === 'true';

  if (!isRbacEnabled) {
    return NextResponse.json({ error: 'RBAC is not enabled' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    // First, check how many entries need migration
    const unmigratedCount = db.prepare(
      'SELECT COUNT(*) as count FROM mood_entries WHERE user_id IS NULL OR user_id = ? OR user_id = ?'
    ).get('', '1') as { count: number };

    if (unmigratedCount.count === 0) {
      return NextResponse.json({ message: 'No entries need migration' });
    }

    // Migrate all entries to the current user
    const stmt = db.prepare(
      'UPDATE mood_entries SET user_id = ? WHERE user_id IS NULL OR user_id = ? OR user_id = ?'
    );

    const result = stmt.run(userId, '', '1');

    return NextResponse.json({
      message: `Successfully migrated ${result.changes} entries to user ${userId}`,
      migratedCount: result.changes
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
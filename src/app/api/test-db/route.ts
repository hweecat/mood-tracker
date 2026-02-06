import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Test database connection
    const moodCount = db.prepare('SELECT COUNT(*) as count FROM mood_entries').get() as { count: number };
    const cbtCount = db.prepare('SELECT COUNT(*) as count FROM cbt_logs').get() as { count: number };
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    // Get a sample of recent entries
    const recentMoods = db.prepare('SELECT * FROM mood_entries ORDER BY timestamp DESC LIMIT 3').all();
    const recentCbt = db.prepare('SELECT * FROM cbt_logs ORDER BY timestamp DESC LIMIT 3').all();

    return NextResponse.json({
      databaseConnected: true,
      session: session ? {
        user: session.user,
        expires: session.expires
      } : 'No session found',
      moodEntries: moodCount.count,
      cbtLogs: cbtCount.count,
      users: userCount.count,
      recentMoods: recentMoods.map(m => ({ ...m, user_id: m.user_id || 'NULL' })),
      recentCbt: recentCbt.map(c => ({ ...c, user_id: c.user_id || 'NULL' })),
      databasePath: process.cwd() + '/mood-tracker.db'
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), process.env.DATABASE_PATH || 'data/mood-tracker.db');
const db = new Database(dbPath);

// Database schema and migrations are now managed by Sqitch.
// Run `sqitch deploy` to apply changes.

export default db;
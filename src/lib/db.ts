import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbRelativePath = process.env.DATABASE_PATH || 'data/mood-tracker.db';
const dbPath = path.join(process.cwd(), dbRelativePath);

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Database schema and migrations are now managed by Sqitch.
// Run `sqitch deploy` to apply changes.

export default db;
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mood-tracker.db');
const db = new Database(dbPath);

// Create tables with new fields
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS mood_entries (
    id TEXT PRIMARY KEY,
    rating INTEGER NOT NULL,
    emotions TEXT NOT NULL,
    note TEXT,
    trigger TEXT,
    behavior TEXT,
    timestamp INTEGER NOT NULL,
    user_id TEXT NOT NULL DEFAULT '1',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS cbt_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    situation TEXT NOT NULL,
    automatic_thoughts TEXT NOT NULL,
    distortions TEXT NOT NULL,
    rational_response TEXT NOT NULL,
    mood_before INTEGER NOT NULL,
    mood_after INTEGER,
    behavioral_link TEXT,
    user_id TEXT NOT NULL DEFAULT '1',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Seed demo user
try {
  db.prepare("INSERT OR IGNORE INTO users (id, name, email) VALUES (?, ?, ?)").run('1', 'Demo User', 'demo@example.com');
} catch {}

// Add columns if they don't exist (migration for existing db)
try {
  db.exec("ALTER TABLE mood_entries ADD COLUMN trigger TEXT");
} catch {}
try {
  db.exec("ALTER TABLE mood_entries ADD COLUMN behavior TEXT");
} catch {}
try {
  db.exec("ALTER TABLE cbt_logs ADD COLUMN behavioral_link TEXT");
} catch {}
try {
  db.exec("ALTER TABLE mood_entries ADD COLUMN user_id TEXT DEFAULT '1'");
} catch {}
try {
  db.exec("ALTER TABLE cbt_logs ADD COLUMN user_id TEXT DEFAULT '1'");
} catch {}

// Create indexes for performance
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON mood_entries(timestamp)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_cbt_logs_timestamp ON cbt_logs(timestamp)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_cbt_logs_user_id ON cbt_logs(user_id)");
} catch {}

export default db;
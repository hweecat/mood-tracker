import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), process.env.DATABASE_PATH || 'data/mood-tracker.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Database schema and migrations are now managed by Sqitch.
// Run `sqitch deploy` to apply changes.
// Auto-initialize for CI and fresh local setups if tables are missing
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!tableCheck) {
    console.log("Initializing database schema...");
    const schemaPath = path.join(process.cwd(), 'db/deploy/appschema.sql');
    const seedPath = path.join(process.cwd(), 'db/deploy/seed-data.sql');
    
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
    }
    
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf8');
      db.exec(seed);
    }
    console.log("Database initialized successfully.");
  }
} catch (e) {
  console.error("Database initialization error:", e);
}

export default db;
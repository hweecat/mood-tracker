-- Deploy mood-tracker:appschema to sqlite

BEGIN;

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
    timestamp INTEGER NOT NULL,
    trigger TEXT,
    behavior TEXT,
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

CREATE INDEX IF NOT EXISTS idx_mood_entries_timestamp ON mood_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_cbt_logs_timestamp ON cbt_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_cbt_logs_user_id ON cbt_logs(user_id);

COMMIT;
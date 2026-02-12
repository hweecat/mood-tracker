-- Revert mood-tracker:add_ai_analysis from sqlite

BEGIN;

-- SQLite doesn't support DROP COLUMN easily in older versions, 
-- but for development, we can use a temporary table pattern if needed.
-- For simple cases and recent SQLite, it might work, or we just accept it.
-- However, standard practice for SQLite revert often involves recreation.
-- For this Phase 1, we will attempt simple revert or acknowledge SQLite limitations.
PRAGMA foreign_keys=OFF;
CREATE TABLE mood_entries_dg_tmp (
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
INSERT INTO mood_entries_dg_tmp(id, rating, emotions, note, timestamp, trigger, behavior, user_id) 
SELECT id, rating, emotions, note, timestamp, trigger, behavior, user_id FROM mood_entries;
DROP TABLE mood_entries;
ALTER TABLE mood_entries_dg_tmp RENAME TO mood_entries;
CREATE INDEX idx_mood_entries_timestamp ON mood_entries(timestamp);
CREATE INDEX idx_mood_entries_user_id ON mood_entries(user_id);
PRAGMA foreign_keys=ON;

COMMIT;

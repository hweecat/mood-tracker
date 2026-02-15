-- Revert mood-tracker:appschema from sqlite

BEGIN;

DROP INDEX IF EXISTS idx_cbt_logs_user_id;
DROP INDEX IF EXISTS idx_mood_entries_user_id;
DROP INDEX IF EXISTS idx_cbt_logs_timestamp;
DROP INDEX IF EXISTS idx_mood_entries_timestamp;
DROP TABLE IF EXISTS cbt_logs;
DROP TABLE IF EXISTS mood_entries;
DROP TABLE IF EXISTS users;

COMMIT;
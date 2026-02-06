-- Verify mood-tracker:appschema on sqlite

BEGIN;

SELECT id, name, email FROM users WHERE 0;
SELECT id, rating, timestamp FROM mood_entries WHERE 0;
SELECT id, timestamp, situation FROM cbt_logs WHERE 0;

ROLLBACK;
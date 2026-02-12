-- Verify mood-tracker:add_ai_analysis on sqlite

BEGIN;

SELECT ai_analysis FROM mood_entries WHERE 0;

COMMIT;

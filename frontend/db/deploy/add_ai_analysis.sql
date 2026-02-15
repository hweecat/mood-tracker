-- Deploy mood-tracker:add_ai_analysis to sqlite

BEGIN;

ALTER TABLE mood_entries ADD COLUMN ai_analysis TEXT;

COMMIT;

-- Verify mood-tracker:add_prompt_versions on sqlite

BEGIN;

SELECT id, version, prompt_type, template, created_at, is_active FROM prompt_versions WHERE 0;

ROLLBACK;

-- Revert mood-tracker:add_prompt_versions from sqlite

BEGIN;

DROP INDEX IF EXISTS idx_prompt_versions_type;
DROP INDEX IF EXISTS idx_prompt_versions_version;
DROP TABLE IF EXISTS prompt_versions;

COMMIT;

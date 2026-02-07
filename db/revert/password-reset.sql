-- Revert mood-tracker:password-reset from sqlite

BEGIN;

DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;
DROP TABLE IF EXISTS password_reset_tokens;

-- Note: SQLite does not support dropping columns easily. 
-- In a real migration, we might recreate the table, but for now we'll just leave the column.

COMMIT;
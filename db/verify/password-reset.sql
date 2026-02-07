-- Verify mood-tracker:password-reset on sqlite

BEGIN;

SELECT password FROM users WHERE 0;
SELECT id, user_id, token_hash FROM password_reset_tokens WHERE 0;

ROLLBACK;
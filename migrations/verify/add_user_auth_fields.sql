-- Verify mood-tracker:add_user_auth_fields on sqlite

BEGIN;

SELECT id, name, username, email, password_hash, image, created_at, password_reset_token_hash, password_reset_expires_at, password_reset_requested_at
FROM users
LIMIT 1;

ROLLBACK;

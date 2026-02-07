-- Verify mood-tracker:seed-password on sqlite

BEGIN;

SELECT 1 FROM users WHERE id = '1' AND password IS NOT NULL;

ROLLBACK;
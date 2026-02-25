-- Verify mood-tracker:seed-data on sqlite

BEGIN;

SELECT 1 FROM users WHERE id = '1';

ROLLBACK;
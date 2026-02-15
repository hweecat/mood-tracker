-- Revert mood-tracker:seed-data from sqlite

BEGIN;

DELETE FROM users WHERE id = '1';

COMMIT;
-- Revert mood-tracker:seed-password from sqlite

BEGIN;

UPDATE users SET password = NULL WHERE id = '1';

COMMIT;
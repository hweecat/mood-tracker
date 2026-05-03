-- Deploy mood-tracker:seed-data to sqlite
-- requires: users

BEGIN;

INSERT OR IGNORE INTO users (id, name, email) VALUES ('1', 'Demo User', 'demo@example.com');

COMMIT;
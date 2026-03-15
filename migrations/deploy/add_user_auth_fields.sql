-- Deploy mood-tracker:add_user_auth_fields to sqlite

BEGIN;

-- Rename existing table
ALTER TABLE users RENAME TO users_backup;

-- Create new table with auth fields and correct order
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    image TEXT,
    created_at INTEGER
);

-- Copy data from backup
-- We use dynamic SQL in application code, but here we must be explicit.
-- Since this runs on existing DBs, we assume old schema.
INSERT INTO users (id, name, email, image)
SELECT id, name, email, image
FROM users_backup;

-- Drop backup table
DROP TABLE users_backup;

COMMIT;

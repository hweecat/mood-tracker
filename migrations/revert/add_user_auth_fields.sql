-- Revert mood-tracker:add_user_auth_fields from sqlite

BEGIN;

-- Rename existing table
ALTER TABLE users RENAME TO users_backup;

-- Recreate original table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    image TEXT
);

-- Copy data back (we lose auth fields)
INSERT INTO users (id, name, email, image)
SELECT id, name, email, image
FROM users_backup;

-- Drop backup table
DROP TABLE users_backup;

COMMIT;

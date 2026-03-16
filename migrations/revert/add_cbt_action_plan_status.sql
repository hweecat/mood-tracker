-- Revert mood-tracker:add_cbt_action_plan_status from sqlite

BEGIN;

PRAGMA foreign_keys=OFF;

CREATE TABLE cbt_logs_dg_tmp (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    situation TEXT NOT NULL,
    automatic_thoughts TEXT NOT NULL,
    distortions TEXT NOT NULL,
    rational_response TEXT NOT NULL,
    mood_before INTEGER NOT NULL,
    mood_after INTEGER,
    behavioral_link TEXT,
    user_id TEXT NOT NULL DEFAULT '1',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO cbt_logs_dg_tmp(
    id,
    timestamp,
    situation,
    automatic_thoughts,
    distortions,
    rational_response,
    mood_before,
    mood_after,
    behavioral_link,
    user_id
)
SELECT
    id,
    timestamp,
    situation,
    automatic_thoughts,
    distortions,
    rational_response,
    mood_before,
    mood_after,
    behavioral_link,
    user_id
FROM cbt_logs;

DROP TABLE cbt_logs;
ALTER TABLE cbt_logs_dg_tmp RENAME TO cbt_logs;

CREATE INDEX idx_cbt_logs_timestamp ON cbt_logs(timestamp);
CREATE INDEX idx_cbt_logs_user_id ON cbt_logs(user_id);

PRAGMA foreign_keys=ON;

COMMIT;

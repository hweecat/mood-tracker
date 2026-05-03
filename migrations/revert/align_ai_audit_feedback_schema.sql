BEGIN;

DROP TABLE IF EXISTS ai_feedback_events;

CREATE TABLE ai_audit_logs_dg_tmp (
    id TEXT PRIMARY KEY,
    correlation_id TEXT NOT NULL,
    masked_payload TEXT,
    response_payload TEXT,
    safety_ratings TEXT,
    ignored_suggestions TEXT,
    status TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

INSERT INTO ai_audit_logs_dg_tmp (
    id,
    correlation_id,
    masked_payload,
    response_payload,
    safety_ratings,
    status,
    timestamp
)
SELECT
    id,
    correlation_id,
    masked_request_payload,
    response_payload,
    safety_ratings,
    status,
    created_at
FROM ai_audit_logs;

DROP TABLE ai_audit_logs;
ALTER TABLE ai_audit_logs_dg_tmp RENAME TO ai_audit_logs;

COMMIT;

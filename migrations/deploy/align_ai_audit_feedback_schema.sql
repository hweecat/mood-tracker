BEGIN;

CREATE TABLE ai_audit_logs_dg_tmp (
    id TEXT PRIMARY KEY,
    correlation_id TEXT NOT NULL,
    user_id TEXT,
    entry_type TEXT,
    entry_id TEXT,
    operation TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_version_id TEXT,
    masked_request_payload TEXT,
    response_payload TEXT,
    safety_ratings TEXT,
    safety_tier TEXT,
    latency_ms INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_code TEXT,
    schema_version INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

INSERT INTO ai_audit_logs_dg_tmp (
    id,
    correlation_id,
    operation,
    provider,
    model,
    masked_request_payload,
    response_payload,
    safety_ratings,
    latency_ms,
    status,
    schema_version,
    created_at
)
SELECT
    id,
    correlation_id,
    'unknown',
    'gemini',
    'unknown',
    masked_payload,
    response_payload,
    safety_ratings,
    0,
    status,
    1,
    timestamp
FROM ai_audit_logs;

DROP TABLE ai_audit_logs;
ALTER TABLE ai_audit_logs_dg_tmp RENAME TO ai_audit_logs;

CREATE TABLE IF NOT EXISTS ai_feedback_events (
    id TEXT PRIMARY KEY,
    audit_log_id TEXT,
    user_id TEXT NOT NULL,
    cbt_log_id TEXT NOT NULL,
    ai_suggestions_payload TEXT,
    ai_reframes_payload TEXT,
    ai_action_plans_payload TEXT,
    accepted_distortions_payload TEXT,
    ignored_distortions_payload TEXT,
    accepted_reframe_payload TEXT,
    ignored_reframes_payload TEXT,
    user_rational_response TEXT,
    accepted_action_plan_payload TEXT,
    user_action_plan TEXT,
    source TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

COMMIT;

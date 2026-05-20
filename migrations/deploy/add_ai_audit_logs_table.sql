CREATE TABLE ai_audit_logs (
    id TEXT PRIMARY KEY,
    correlation_id TEXT NOT NULL,
    masked_payload TEXT,
    response_payload TEXT,
    safety_ratings TEXT,
    ignored_suggestions TEXT,
    status TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

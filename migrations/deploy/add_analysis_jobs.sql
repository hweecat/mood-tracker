BEGIN;

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    status TEXT NOT NULL,
    result_payload TEXT,
    error_code TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_entry_created_at
ON analysis_jobs(user_id, entry_type, entry_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at
ON analysis_jobs(created_at);

COMMIT;

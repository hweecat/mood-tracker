-- Deploy mood-tracker:add_prompt_versions to sqlite

BEGIN;

CREATE TABLE IF NOT EXISTS prompt_versions (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    prompt_type TEXT NOT NULL,  -- "distortion_detection" or "reframing"
    template TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_version ON prompt_versions(version);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_type ON prompt_versions(prompt_type);

-- Seed initial default prompts
INSERT OR IGNORE INTO prompt_versions (id, version, prompt_type, template, description, created_at, is_active)
VALUES (
    'default-distortion',
    '1.0.0',
    'distortion_detection',
    '-- Managed by PromptManager, use code defaults',
    'Default distortion detection template',
    strftime('%s', 'now'),
    1
), (
    'default-reframing',
    '1.0.0',
    'reframing',
    '-- Managed by PromptManager, use code defaults',
    'Default reframing template',
    strftime('%s', 'now'),
    1
);

COMMIT;

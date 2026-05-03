# Audit Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix AI audit persistence and capture model/user HITL feedback for evals without leaking sensitive data into logs.

**Architecture:** Add a repository/service boundary for AI audit and feedback events. Align Sqitch migrations, code-driven SQLite initialization, Pydantic schemas, and Gemini/provider call sites around one canonical schema. Store user feedback as application data with explicit privacy treatment.

**Tech Stack:** FastAPI, Pydantic, sqlite3, Sqitch, pytest.

---

## Worktree

- Path: `.worktrees/audit-observability`
- Branch: `codex/audit-observability`
- Depends on: `.worktrees/` ignored and baseline backend tests run.

## File Ownership

- Modify: `backend/app/services/gemini_client.py`
- Modify: `backend/app/db/session.py`
- Modify: `backend/app/schemas/cbt.py`
- Modify: `backend/app/repositories/cbt.py`
- Modify: `backend/app/api/v1/routes/cbt_logs.py`
- Create: `backend/app/schemas/ai_audit.py`
- Create: `backend/app/repositories/ai_audit.py`
- Create: `backend/app/services/ai_audit_service.py`
- Create: `backend/tests/repositories/test_ai_audit_repository.py`
- Create: `backend/tests/services/test_ai_audit_service.py`
- Modify/Create: `backend/tests/integration/test_cbt_logs_feedback_capture.py`
- Add Sqitch deploy/revert/verify migration for aligned audit and feedback tables.

## Requirements

- Audit writes must succeed with the migrated SQLite schema.
- Existing audit insert failures must become test-covered regressions.
- Audit rows must include provider, model, operation, prompt version, status, latency, safety tier, and schema version.
- Feedback rows must capture accepted/ignored model outputs and final user-owned responses.
- Application logs must not include raw journal text or prompt payloads.
- Tests must not require real Gemini, OpenAI, or Ollama calls.

## Tasks

### Task 1: Reproduce the Audit Schema Mismatch

- [ ] Write failing repository test in `backend/tests/repositories/test_ai_audit_repository.py`.

```python
import sqlite3

from app.repositories.ai_audit import AIAuditLogCreate, create_ai_audit_log


def test_create_ai_audit_log_persists_provider_metadata():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE ai_audit_logs (
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
    """)

    row_id = create_ai_audit_log(db, AIAuditLogCreate(
        correlation_id="corr-1",
        user_id="user-1",
        entry_type="cbt_log",
        entry_id="entry-1",
        operation="generate_reframes",
        provider="gemini",
        model="gemini-1.5-flash",
        prompt_version_id="prompt-1",
        masked_request_payload={"automatic_thought": "[MASKED]"},
        response_payload={"reframes": []},
        safety_ratings={"harassment": "LOW"},
        safety_tier="negligible",
        latency_ms=123,
        status="success",
        error_code=None,
        schema_version=1,
        created_at=1710000000,
    ))

    row = db.execute("SELECT * FROM ai_audit_logs WHERE id = ?", (row_id,)).fetchone()
    assert row["provider"] == "gemini"
    assert row["model"] == "gemini-1.5-flash"
    assert row["status"] == "success"
```

- [ ] Run `cd backend; pytest tests/repositories/test_ai_audit_repository.py -v`.
- [ ] Verify it fails because `app.repositories.ai_audit` does not exist.

### Task 2: Implement Audit Schema And Repository

- [ ] Create `backend/app/schemas/ai_audit.py` with `AIAuditLogCreate` and `AIFeedbackEventCreate`.
- [ ] Create `backend/app/repositories/ai_audit.py` with `create_ai_audit_log()` and `create_ai_feedback_event()`.
- [ ] Serialize JSON payload fields with `json.dumps(..., sort_keys=True)`.
- [ ] Run the repository tests and verify they pass.

### Task 3: Add Feedback Capture Regression Tests

- [ ] Write failing test for feedback persistence in `backend/tests/repositories/test_ai_audit_repository.py`.
- [ ] Include accepted distortions, ignored reframes, `user_rational_response`, accepted action plan, and `source="edited_ai"`.
- [ ] Run the test and verify it fails before implementation.
- [ ] Implement `ai_feedback_events` repository insert.
- [ ] Verify the test passes.

### Task 4: Align Migrations And DB Init

- [ ] Add a Sqitch migration that creates missing canonical columns and `ai_feedback_events`.
- [ ] Update verify migration to select all new required columns.
- [ ] Update revert migration to cleanly undo the new change.
- [ ] Update `backend/app/db/session.py` so local code-driven DB initialization creates the same tables for dev/test.
- [ ] Add migration shape tests that inspect `PRAGMA table_info(ai_audit_logs)` and `PRAGMA table_info(ai_feedback_events)`.

### Task 5: Replace Inline Gemini Audit Insert

- [ ] Write failing service test that patches a fake DB and asserts `GeminiClient.analyze_cbt()` records provider metadata through `ai_audit_service`.
- [ ] Replace `GeminiClient._log_audit()` with the shared audit service.
- [ ] Ensure failure paths record `timeout`, `provider_error`, `parse_error`, or `safety_blocked` status without raw prompt text in logger extras.
- [ ] Run `cd backend; pytest tests/services/test_ai_audit_service.py tests/services/test_gemini_client.py -v`.

### Task 6: Capture User Accepted/User Edited CBT Outcomes

- [ ] Extend `CBTLogCreate` with optional `ai_analysis_id`, `accepted_reframe_id`, `ignored_reframe_ids`, `accepted_action_plan_id`, and `feedback_source`.
- [ ] Write failing integration test in `backend/tests/integration/test_cbt_logs_feedback_capture.py` that posts a CBT log and verifies one `ai_feedback_events` row is inserted.
- [ ] Implement feedback capture in `create_cbt_log()` or an adjacent service called by the route.
- [ ] Preserve existing clients by making new fields optional.

### Task 7: Privacy Regression

- [ ] Add a log-capture test that submits text such as `My email is jane@example.com and I feel hopeless` and asserts `jane@example.com` is not present in captured log records.
- [ ] Ensure repository tests allow sensitive content only in designed application-data fields, not logger extras.
- [ ] Run `cd backend; pytest tests/repositories tests/services tests/integration/test_cbt_logs_feedback_capture.py -v`.

## Acceptance Criteria

- Audit and feedback repository tests pass.
- CBT log integration test proves user/model feedback is persisted.
- Gemini audit no longer inserts columns that do not exist.
- No raw sensitive test strings appear in captured logs.
- `migrations/verify/*` covers the new schema.


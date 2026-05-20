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

- [x] Write failing repository test in `backend/tests/repositories/test_ai_audit_repository.py`.

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

- [x] Run `cd backend; pytest tests/repositories/test_ai_audit_repository.py -v`.
- [x] Verify it fails because `app.repositories.ai_audit` does not exist.

### Task 2: Implement Audit Schema And Repository

- [x] Create `backend/app/schemas/ai_audit.py` with `AIAuditLogCreate` and `AIFeedbackEventCreate`.
- [x] Create `backend/app/repositories/ai_audit.py` with `create_ai_audit_log()` and `create_ai_feedback_event()`.
- [x] Serialize JSON payload fields with `json.dumps(..., sort_keys=True)`.
- [x] Run the repository tests and verify they pass.

### Task 3: Add Feedback Capture Regression Tests

- [x] Write failing test for feedback persistence in `backend/tests/repositories/test_ai_audit_repository.py`.
- [x] Include accepted distortions, ignored reframes, `user_rational_response`, accepted action plan, and `source="edited_ai"`.
- [x] Run the test and verify it fails before implementation.
- [x] Implement `ai_feedback_events` repository insert.
- [x] Verify the test passes.

### Task 4: Align Migrations And DB Init

- [x] Add a Sqitch migration that creates missing canonical columns and `ai_feedback_events`.
- [x] Update verify migration to select all new required columns.
- [x] Update revert migration to cleanly undo the new change.
- [x] Update `backend/app/db/session.py` so local code-driven DB initialization creates the same tables for dev/test.
- [x] Add migration shape tests that inspect `PRAGMA table_info(ai_audit_logs)` and `PRAGMA table_info(ai_feedback_events)`.

### Task 5: Replace Inline Gemini Audit Insert

- [x] Write failing service test that patches a fake DB and asserts `GeminiClient.analyze_cbt()` records provider metadata through `ai_audit_service`.
- [x] Replace `GeminiClient._log_audit()` with the shared audit service.
- [x] Ensure failure paths record `timeout`, `provider_error`, `parse_error`, or `safety_blocked` status without raw prompt text in logger extras.
- [x] Run `cd backend; pytest tests/services/test_ai_audit_service.py tests/services/test_gemini_client.py -v`.

### Task 6: Capture User Accepted/User Edited CBT Outcomes

- [x] Extend `CBTLogCreate` with optional `ai_analysis_id`, `accepted_reframe_id`, `ignored_reframe_ids`, `accepted_action_plan_id`, and `feedback_source`.
- [x] Write failing integration test in `backend/tests/integration/test_cbt_logs_feedback_capture.py` that posts a CBT log and verifies one `ai_feedback_events` row is inserted.
- [x] Implement feedback capture in `create_cbt_log()` or an adjacent service called by the route.
- [x] Preserve existing clients by making new fields optional.

### Task 7: Privacy Regression

- [x] Add a log-capture test that submits text such as `My email is jane@example.com and I feel hopeless` and asserts `jane@example.com` is not present in captured log records.
- [x] Ensure repository tests allow sensitive content only in designed application-data fields, not logger extras.
- [x] Run `cd backend; pytest tests/repositories tests/services tests/integration/test_cbt_logs_feedback_capture.py -v`.

## Validation Status

- [x] PR opened: https://github.com/hweecat/mood-tracker/pull/7.
- [x] Local audit-focused verification after lint fix: `uv run --with ruff ruff check .` passed.
- [x] Local audit-focused verification after lint fix: `uv run --with pytest pytest tests\services\test_gemini_client.py tests\services\test_ai_audit_service.py` passed with CI-equivalent Gemini env vars (`14 passed`).
- [x] GitHub Actions CI passed for current head `53399baeb9006024e330fdfb4f4734d34c4eab80` (run `25492073370`).
- [x] 2026-05-10 re-verification: focused audit suite `tests\repositories tests\services tests\integration\test_cbt_logs_feedback_capture.py` passed with `40 passed, 38 warnings`; `uv run --with ruff ruff check .` passed.
- [x] PR is ready for review and mergeable as of 2026-05-10.
- [x] PR review follow-up: ensure every CBT analysis audit row is persisted with authenticated `user_id` before returning `aiAnalysisId`.
- [x] 2026-05-19 re-verification: focused audit suite `tests/integration/test_cbt_analyze_endpoint.py tests/services/test_ai_audit_service.py tests/integration/test_cbt_logs_feedback_capture.py tests/repositories/test_ai_audit_repository.py` passed with `26 passed, 35 warnings`.
- [ ] Integration note: provider fallback work adds a user-aware `analyze_cbt(..., user_id=current_user.id)` path; preserve that behavior when rebasing/merging audit and provider branches.

## Acceptance Criteria

- Audit and feedback repository tests pass.
- CBT log integration test proves user/model feedback is persisted.
- Gemini audit no longer inserts columns that do not exist.
- Analyze-then-save feedback linkage is user-scoped: returned analysis ids only link to audit rows owned by the current user.
- No raw sensitive test strings appear in captured logs.
- `migrations/verify/*` covers the new schema.

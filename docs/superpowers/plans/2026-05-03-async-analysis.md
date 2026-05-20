# Async Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run mood and CBT longitudinal analysis asynchronously after successful inserts, then persist retrievable analysis status and results.

**Architecture:** Add analysis job/result tables and a service boundary invoked by FastAPI `BackgroundTasks`. The first implementation stays SQLite/local but keeps queue-like boundaries for a future worker system.

**Tech Stack:** FastAPI BackgroundTasks, sqlite3, Pydantic, pytest, httpx ASGI integration tests.

---

## Worktree

- Path: `.worktrees/async-analysis`
- Branch: `codex/async-analysis`
- Depends on: audit contracts from `codex/audit-observability`.

## File Ownership

- Modify: `backend/app/api/v1/routes/moods.py`
- Modify: `backend/app/api/v1/routes/cbt_logs.py`
- Modify: `backend/app/repositories/mood.py`
- Modify: `backend/app/repositories/cbt.py`
- Create: `backend/app/schemas/analysis.py`
- Create: `backend/app/repositories/analysis.py`
- Create: `backend/app/services/analysis_jobs.py`
- Create: `backend/app/services/journal_analysis.py`
- Create: `backend/tests/repositories/test_analysis_repository.py`
- Create: `backend/tests/services/test_analysis_jobs.py`
- Create: `backend/tests/integration/test_async_analysis_scheduling.py`
- Add Sqitch deploy/revert/verify migration for analysis jobs/results.

## Requirements

- Mood and CBT inserts must commit before analysis begins.
- Insert responses should not wait for model inference or longitudinal analysis.
- Analysis job status must be persisted.
- Background task must use a fresh DB connection, not the request-scoped connection.
- Failed analysis should not roll back the original journal or mood entry.
- Results should be compact for retrieval and indexed by `user_id`, `entry_type`, `entry_id`, and `created_at`.

## Tasks

### Task 1: Add Analysis Repository Tests

- [x] Write failing tests in `backend/tests/repositories/test_analysis_repository.py`.

```python
import sqlite3

from app.repositories.analysis import create_analysis_job, mark_analysis_job_succeeded


def test_analysis_job_lifecycle_persists_status_and_result():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE analysis_jobs (
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
    """)

    job_id = create_analysis_job(db, user_id="user-1", entry_type="mood_entry", entry_id="mood-1", analysis_type="mood_enrichment")
    mark_analysis_job_succeeded(db, job_id, {"summary": "negative sentiment trend"})

    row = db.execute("SELECT status, result_payload FROM analysis_jobs WHERE id = ?", (job_id,)).fetchone()
    assert row["status"] == "succeeded"
    assert "negative sentiment trend" in row["result_payload"]
```

- [x] Run `cd backend; pytest tests/repositories/test_analysis_repository.py -v`.
- [x] Implement repository functions.

### Task 2: Add Migrations And DB Init

- [x] Add Sqitch migration for `analysis_jobs` or `entry_analyses`.
- [x] Include indexes for `user_id`, `entry_type`, `entry_id`, and `created_at`.
- [x] Update `backend/app/db/session.py` local init to include the same table.
- [x] Add schema inspection tests.

### Task 3: Schedule Mood Analysis After Insert

- [x] Write failing integration test that patches `BackgroundTasks.add_task` or an injected scheduler and asserts mood POST schedules analysis after repository insert.
- [x] Refactor `create_mood_entry()` so it persists immediately and does not call `analyze_mood_note()` inline.
- [x] Add a background service that performs mood enrichment and stores result payload.
- [x] Preserve response compatibility by returning `aiAnalysis=None` or current persisted result if already available.

### Task 4: Schedule CBT Longitudinal Analysis After Insert

- [x] Write failing integration test that POSTs a CBT log and asserts a longitudinal analysis job is queued.
- [x] Implement `journal_analysis.py` to summarize patterns from recent mood and CBT records for the same user.
- [x] Keep the first analysis deterministic and cheap: counts, top distortions, mood delta, and candidate interventions.
- [x] Store result payload compactly.

### Task 5: Retrieval Endpoint

- [x] Add `GET /api/v1/analyses/` or a nested endpoint that returns analysis jobs/results filtered by entry.
- [x] Write integration tests for authenticated user scoping.
- [x] Ensure users cannot retrieve another user's analysis jobs.

## Validation Status

- [x] PR opened: https://github.com/hweecat/mood-tracker/pull/8.
- [x] GitHub Actions CI passed for current head `2ab39c196c6c86922bd096f1d7a7eb2162b35d8a` (run `25492089771`).
- [x] 2026-05-10 re-verification: focused async repository/service/integration suite passed with `18 passed, 22 warnings`; focused audit/analyze integration suite passed with `18 passed, 21 warnings`.
- [x] PR is ready for review and mergeable as of 2026-05-10.
- [x] PR review follow-up: preserve mood `aiAnalysis` for existing `/moods` consumers after async analysis succeeds.
- [x] PR review follow-up: make CBT log insert and feedback-event persistence atomic so feedback failures do not leave a committed CBT row while the client receives an error.
- [x] Verification follow-up: define and test duplicate async-analysis scheduling/idempotency behavior.
- [x] 2026-05-19 re-verification: focused async suite `tests/repositories/test_analysis_repository.py tests/services/test_analysis_jobs.py tests/integration/test_async_analysis_scheduling.py tests/repositories/test_ai_audit_repository.py tests/integration/test_cbt_logs_feedback_capture.py tests/integration/test_cbt_analyze_endpoint.py tests/services/test_ai_audit_service.py` passed with `49 passed, 53 warnings`.
- [ ] Frontend follow-up: fetch and display `/api/v1/analyses/` results, or explicitly document the backend-only scope for the first merge.

## Acceptance Criteria

- Mood and CBT inserts return without waiting for analysis.
- Analysis job lifecycle is persisted and test-covered.
- Analysis failure does not roll back source entry creation.
- Completed mood analysis remains visible through the existing mood retrieval contract or a documented compatible replacement path.
- CBT create plus feedback capture has single-transaction semantics from the client's perspective.
- Retrieval endpoint is user-scoped.
- Existing mood/CBT tests remain compatible.

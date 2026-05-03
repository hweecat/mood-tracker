# Backend Architecture Findings (2026-03-17)

This document summarizes the **backend implementation as it exists in this repo** (mainline `backend/`), and calls out notable differences in the JWT-auth worktree (`.worktrees/auth/backend/`).

For cross-cutting UI↔API integration flows and doc/diagram drift, see `docs/repo_architecture_findings.md:1`.

## Scope & Sources

- Mainline backend entrypoint: `backend/app/main.py:1`
- Mainline routers: `backend/app/api/v1/routes/:1`
- Mainline persistence + schema init: `backend/app/db/session.py:1`
- Mainline repositories (raw SQL): `backend/app/repositories/:1`
- AI services: `backend/app/services/:1`
- Sqitch migrations (mainline): `migrations/sqitch.plan:1`, `migrations/deploy/appschema.sql:1`
- Auth worktree (JWT) entrypoint: `.worktrees/auth/backend/app/main.py:1`
- Auth worktree auth deps + security: `.worktrees/auth/backend/app/api/deps.py:1`, `.worktrees/auth/backend/app/core/security.py:1`
- Auth worktree auth routes: `.worktrees/auth/backend/app/api/v1/routes/auth.py:1`
- Auth worktree migrations: `.worktrees/auth/migrations/sqitch.plan:1`

## Mainline Backend (root `backend/`) — What Exists

### Runtime shape

- FastAPI app with v1 routers mounted under `/api/v1/*`: `backend/app/main.py:1`
- CORS is permissive (`allow_origins=["*"]`): `backend/app/main.py:24`
- Correlation ID middleware injects/propagates `X-Correlation-ID`: `backend/app/api/middleware.py:1`

### API surface (observed)

- Moods: `backend/app/api/v1/routes/moods.py:1`
  - `GET /api/v1/moods/`
  - `POST /api/v1/moods/`
  - `DELETE /api/v1/moods/{mood_id}`
- CBT logs: `backend/app/api/v1/routes/cbt_logs.py:1`
  - `GET /api/v1/cbt-logs/`
  - `POST /api/v1/cbt-logs/`
  - `PUT /api/v1/cbt-logs/{log_id}`
  - `DELETE /api/v1/cbt-logs/{log_id}`
  - `POST /api/v1/cbt-logs/analyze` (AI call with timeout)
- Users: `backend/app/api/v1/routes/users.py:1`
  - `GET /api/v1/users/me` (demo user id = `"1"`)
  - `PUT /api/v1/users/me`
- Import/Export: `backend/app/api/v1/routes/data.py:1`
  - `GET /api/v1/data/export?format=json|csv|md`
  - `POST /api/v1/data/import` (JSON only)

### Persistence & schema management (current split-brain)

- Code-driven schema init + demo user seeding is embedded in the app startup path:
  - `init_db()` is called at import time in `backend/app/main.py:1`
  - Schema DDL lives in `backend/app/db/session.py:1`
- Sqitch migrations exist separately under `migrations/`:
  - Plan: `migrations/sqitch.plan:1`
  - Base schema: `migrations/deploy/appschema.sql:1`

Today, the codebase contains **both** mechanisms. Canonical docs/diagrams should reflect this until one is removed.

### Repository layer (raw SQL)

- Mood entries repo: `backend/app/repositories/mood.py:1`
- CBT logs repo: `backend/app/repositories/cbt.py:1`

These operate over `sqlite3.Connection` with SQL statements (not SQLModel/ORM at runtime).

### AI orchestration (as implemented)

- Client factory + TextBlob mood analysis + Gemini adapter: `backend/app/services/ai_client.py:1`
- Gemini CBT analysis + safety exception type: `backend/app/services/gemini_client.py:1`
- CBT analyze endpoint runs request/response with a 10s timeout:
  - `asyncio.wait_for(..., timeout=10.0)` in `backend/app/api/v1/routes/cbt_logs.py:42`

### Known schema mismatch: `ai_audit_logs`

The mainline Gemini client attempts to write PII-free audit rows, but **the code and Sqitch schema do not currently match**:

- Code inserts into `ai_audit_logs` with columns like `request_id`, `prompt_version_id`, `safety_tier`, `latency_ms`, `success`, `created_at`:
  - `backend/app/services/gemini_client.py:260`
- Sqitch migration creates `ai_audit_logs` with a different set of columns (e.g. `correlation_id`, `masked_payload`, `response_payload`, `status`, `timestamp`):
  - `migrations/deploy/add_ai_audit_logs_table.sql:1`

Implication: with Sqitch-applied schemas, the audit insert will fail (and is currently caught/logged). Docs/diagrams should avoid implying “audit logging is working end-to-end” until this is reconciled.

## Auth Worktree Backend (`.worktrees/auth/backend/`) — Notable Differences

### JWT authentication (toggleable)

- Adds auth endpoints:
  - `.worktrees/auth/backend/app/api/v1/routes/auth.py:1` (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`)
- Adds OAuth2 bearer parsing + “demo-user bypass”:
  - `.worktrees/auth/backend/app/api/deps.py:1`
  - `ENABLE_AUTH` env var gates auth enforcement; when disabled, requests are treated as user `id="1"`.
- Adds password hashing + JWT creation:
  - `.worktrees/auth/backend/app/core/security.py:1`

### User-scoped routing

Most routers in the auth worktree depend on `get_current_user` and use `current_user.id` instead of hard-coding `"1"`:

- `.worktrees/auth/backend/app/api/v1/routes/moods.py:1`
- `.worktrees/auth/backend/app/api/v1/routes/cbt_logs.py:1`
- `.worktrees/auth/backend/app/api/v1/routes/users.py:1`

### Schema changes & migrations

- Auth worktree Sqitch plan adds:
  - `add_user_auth_fields` and `add_cbt_action_plan_status`: `.worktrees/auth/migrations/sqitch.plan:1`
- Auth worktree code-driven DB init includes additional columns and ad-hoc migration logic:
  - `.worktrees/auth/backend/app/db/session.py:1`

### Known doc/diagram implications

If the auth worktree becomes “canonical”, diagrams/docs should explicitly show:
- Login → bearer token propagation (frontend + backend)
- `ENABLE_AUTH` dual-mode behavior
- User scoping (`current_user.id`) as the default execution path

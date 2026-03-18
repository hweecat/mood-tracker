# Repo Architecture Findings (2026-03-17)

This document captures the **integration view** of the system: how the **frontend and backend fit together**, and where the **docs/diagrams drift** from what the repo actually implements.

Backend-only implementation notes live in `docs/backend_architecture_findings.md:1`.
Frontend-only interface/design notes live in `docs/frontend_interface_and_design_findings.md:1`.

## Scope & Sources

- Root repo: `README.md:1`, `docs/architecture.md:1`, `docs/diagrams/*.excalidraw:1`
- Integration touchpoints:
  - Frontend API calls: `frontend/src/hooks/useTrackerData.ts:1`, `frontend/src/hooks/useCBTAnalysis.ts:1`
  - Backend API surface: `backend/app/api/v1/routes/:1`
  - Auth worktree token propagation: `.worktrees/auth/frontend/src/hooks/useTrackerData.ts:1`, `.worktrees/auth/backend/app/api/deps.py:1`

## Repo Topology (what exists)

- `frontend/`: Next.js App Router UI + NextAuth (credentials) + Tailwind-based design system.
- `backend/`: FastAPI service exposing `/api/v1/*`, SQLite via `sqlite3`, plus AI orchestration.
- `migrations/`: Sqitch migrations (but the backend also has `init_db()` logic).
- `.worktrees/`: parallel “feature” snapshots (`auth`, `ui`, `gemini-async`, `pii`, `gemini`) each with their own `docs/` and app code.

## Current System Architecture (integration view, observed)

**Baseline (root `backend/` + root `frontend/`)**
- Frontend calls backend directly using `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`). Example: `frontend/src/hooks/useTrackerData.ts:1`.
- Backend is FastAPI with routers under `/api/v1/*`. Entry: `backend/app/main.py:1`.
- Persistence is SQLite; the frontend never talks to SQLite directly (all DB access is behind the FastAPI boundary).
- “Single page shell” UX: most user interactions happen inside `/` (tab state) rather than multiple routes: `frontend/src/app/page.tsx:1`.

**Auth worktree (`.worktrees/auth/`)**
- Adds JWT-based backend auth endpoints: `.worktrees/auth/backend/app/api/v1/routes/auth.py:1`.
- Adds `get_current_user` dependency with an `ENABLE_AUTH` toggle (demo user when disabled): `.worktrees/auth/backend/app/api/deps.py:1`.
- Updates frontend hooks to attach `Authorization: Bearer ...` from session: `.worktrees/auth/frontend/src/hooks/useTrackerData.ts:1`.

## Frontend ↔ Backend Contract (what the UI calls today)

At a high level, the UI is a Next.js client app that calls a FastAPI backend over HTTP:

- CRUD (client hook): `frontend/src/hooks/useTrackerData.ts:1`
  - `GET/POST/DELETE /api/v1/moods/*`
  - `GET/POST/PUT/DELETE /api/v1/cbt-logs/*`
- AI analysis (client hook): `frontend/src/hooks/useCBTAnalysis.ts:1`
  - `POST /api/v1/cbt-logs/analyze`
- Export/import (UI component): `frontend/src/components/DataManagement.tsx:1`
  - Uses backend `/api/v1/data/export` and `/api/v1/data/import`

When the JWT auth worktree is used, requests become user-scoped via bearer tokens:
- Frontend adds bearer token headers in `.worktrees/auth/frontend/src/hooks/useTrackerData.ts:1`.
- Backend enforces via `.worktrees/auth/backend/app/api/deps.py:1` (unless `ENABLE_AUTH=false`).

## Auth Integration (two “modes” in repo)

- **Mainline mode (root)**: NextAuth is used to gate UI routes, but backend endpoints assume a demo user (`"1"`) and do not require bearer tokens by default.
  - NextAuth middleware: `frontend/src/middleware.ts:1`
  - Credentials provider (demo): `frontend/src/lib/auth.ts:1`
- **JWT mode (auth worktree)**: NextAuth stores a backend JWT in session and frontend hooks attach it to backend calls.
  - NextAuth config: `.worktrees/auth/frontend/src/lib/auth.ts:1`
  - Backend auth deps: `.worktrees/auth/backend/app/api/deps.py:1`

## Documentation / Diagram Drift (highest-impact mismatches)

### Resolved (mainline baseline)

- `docs/architecture.md:1` now reflects mainline persistence (**`sqlite3` + raw SQL repositories**) and the AI execution model (request/response with timeouts).
- Mainline Mermaid diagram sources exist for the canonical view:
  - `docs/diagrams/mainline_component_architecture.mmd`
  - `docs/diagrams/mainline_frontend_ui_composition.mmd`
  - `docs/diagrams/mainline_cbt_analysis_sequence.mmd`

### Remaining (still drifting / confusing)

- `frontend/README.md:1` has been updated to match “Next.js UI → FastAPI → SQLite”, but it’s high-churn and easy to regress—treat it as canonical and keep it aligned with code changes.
- Excalidraw diagrams are still present (`docs/diagrams/*.excalidraw:1`) and may be interpreted as canonical unless explicitly updated or marked “legacy”.
- Backend audit logging is not schema-aligned: `backend/app/services/gemini_client.py:260` vs `migrations/deploy/add_ai_audit_logs_table.sql:1` (details in `docs/backend_architecture_findings.md:1`).
- Auth worktree is intentionally out-of-scope for canonical docs until promoted (see `.worktrees/auth/`).

## What to Update (recommended doc/diagram edits)

### Keep `frontend/README.md` aligned

- Ensure the README continues to describe the mainline integration contract:
  - Next.js UI → `fetch()` → FastAPI `/api/v1/*` → SQLite
  - NextAuth is demo/session gating; backend assumes `user_id = "1"` in mainline

### Make diagram source-of-truth explicit

- Either update `docs/diagrams/*.excalidraw` to match the Mermaid “mainline” diagrams, or add a clear note somewhere canonical (e.g. `docs/architecture.md`) that Mermaid is the current diagram source-of-truth.

### Track backend audit-log mismatch

- Decide whether to update the Sqitch `ai_audit_logs` schema or the Gemini audit insert logic; until then, avoid docs implying audit logs are fully operational.

# Diagram & Architecture Doc Update Checklist (2026-03-17)

This is a prioritized, concrete checklist to bring `docs/` and diagrams in sync with what the repo currently implements.

## 0) Source of truth (current decision)

- **Mainline** is the current source of truth (root `frontend/` + `backend/`).
- `.worktrees/*` (including the JWT auth variant) is treated as experimental and should not drive canonical `docs/` until promoted.

## 1) Update architecture docs (text)

- `docs/architecture.md:1`
  - Done: aligned to mainline (`sqlite3` + raw SQL repositories), request/response AI model, and schema-management split (`migrations/` + `init_db()`).
  - Done: endpoint table includes `POST /api/v1/cbt-logs/analyze`.

- `frontend/README.md:24`
  - TODO: update to “Next.js UI calling FastAPI `/api/v1/*` via `NEXT_PUBLIC_API_URL`”.
  - TODO: document current auth reality: NextAuth session gating (UI) + backend demo `user_id = "1"`.

## 2) Update existing diagrams (Excalidraw)

- `docs/diagrams/component_architecture.excalidraw:1`
  - Add frontend “real” internal boundaries:
    - `/` tabbed shell (`frontend/src/app/page.tsx:1`)
    - UI primitives (`frontend/src/components/ui/:1`) vs domain components (`frontend/src/components/:1`)
    - Hooks: `useTrackerData` and `useCBTAnalysis` (`frontend/src/hooks/:1`)
  - Add schema/migrations component (Sqitch → SQLite) if you rely on `migrations/` in practice.

- `docs/diagrams/data_flow.excalidraw:1`
  - Split or extend beyond “Mood check-in”:
    - Login flow (NextAuth session gating)
    - CBT analyze flow (`POST /api/v1/cbt-logs/analyze` → Gemini → response)
    - Export/import flow (and note user scoping limitations)

## 3) Add missing diagrams (recommended)

- UI composition + state diagram (Mermaid or Excalidraw): tab state → dynamic views → hooks → backend API.
- (Optional / future) Auth sequence diagram if/when the JWT worktree is promoted to mainline.
- CBT analysis sequence diagram: form → `useCBTAnalysis` → FastAPI → Gemini → response → user-in-the-loop selection.

Status (mainline Mermaid sources):
- Component diagram: `docs/diagrams/mainline_component_architecture.mmd`
- UI composition: `docs/diagrams/mainline_frontend_ui_composition.mmd`
- CBT analysis sequence: `docs/diagrams/mainline_cbt_analysis_sequence.mmd`

## 4) Reduce doc duplication drift (worktrees)

- Consider designating **one** canonical `docs/` location (root) and treating `.worktrees/*/docs` as snapshots, or delete/stop updating duplicates to avoid divergence.

## Supporting Findings

- Frontend-focused findings: `docs/frontend_interface_and_design_findings.md:1`
- Integration findings + drift: `docs/repo_architecture_findings.md:1`

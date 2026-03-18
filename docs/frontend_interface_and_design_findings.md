# Frontend Interface & Design Findings (2026-03-17)

This document summarizes the **frontend structure and UI design system**, and lists what should be **updated/added** in architecture docs/diagrams to reflect the actual frontend implementation.

For the UI↔API contract and cross-cutting integration flows, see `docs/repo_architecture_findings.md:1`.

## App Structure (Next.js App Router)

- Root layout (fonts + providers): `frontend/src/app/layout.tsx:1`
  - Providers: `frontend/src/components/AuthProvider.tsx:1`, `frontend/src/components/ThemeProvider.tsx:1`
- Primary UI shell: `frontend/src/app/page.tsx:1`
  - Implements a “single-page app” feel: tab state (`dashboard`/`mood`/`journal`/`insights`/`menu`) instead of multiple routes.
  - Uses dynamic imports for heavier views (history/chart/insights/etc.).
- Auth screens:
  - Login: `frontend/src/app/login/page.tsx:1`
  - Auth worktree adds register: `.worktrees/auth/frontend/src/app/register/page.tsx:1`
- Route protection:
  - NextAuth middleware: `frontend/src/middleware.ts:1` (protects everything except `/login`, `api/auth`, and static assets)

## Design System & UI Composition

- Styling base: Tailwind v4 + CSS variables + light/dark mode tokens in `frontend/src/app/globals.css:1`.
  - “Neo-brutalist” surfaces/interaction helpers: `frontend/src/app/globals.css:118`.
- UI primitives:
  - Variant-driven components using CVA: `frontend/src/components/ui/Button.tsx:1`
  - Reusable surface component: `frontend/src/components/ui/Card.tsx:1`
- Utility glue:
  - `cn()` class combiner: `frontend/src/lib/utils.ts:1`
- Domain components are composed from primitives (forms/views/widgets), e.g.:
  - CBT journaling flow + HITL UI: `frontend/src/components/CBTLogForm.tsx:1`
  - Mood check-in + charts: `frontend/src/components/MoodEntryForm.tsx:1`, `frontend/src/components/MoodChart.tsx:1`
  - Export/import UI: `frontend/src/components/DataManagement.tsx:1`

## UI State & Data Flow (actual implementation)

This repo uses hooks to orchestrate UI state and remote calls:

- CRUD hook: `frontend/src/hooks/useTrackerData.ts:1`
- AI analysis hook: `frontend/src/hooks/useCBTAnalysis.ts:1`

Details of endpoints, auth headers, and per-worktree differences are documented in `docs/repo_architecture_findings.md:1`.

## NextAuth Integration (what exists today)

- Session provider: `frontend/src/components/AuthProvider.tsx:1`
- NextAuth handler route: `frontend/src/app/api/auth/[...nextauth]/route.ts:1`
- Credentials provider config:
  - Baseline: `frontend/src/lib/auth.ts:1` (demo credentials; fetches `/api/v1/users/me` without bearer token)
  - Auth worktree: `.worktrees/auth/frontend/src/lib/auth.ts:1` (intended to call `/api/v1/auth/login` and store backend access token in session)

## Tests & Quality Signals

- Vitest + RTL unit/integration: `frontend/__tests__/CBTLogForm.test.tsx:1`, `frontend/__tests__/useTrackerData.test.tsx:1`
- E2E:
  - Selenium + Axe flows: `frontend/e2e/login.test.ts:1`, `frontend/e2e/accessibility.test.ts:1`
  - Playwright VRT: `frontend/e2e/visual/vrt_cbt_flow.spec.ts:1`

## What Should Change in Docs / Diagrams (frontend-focused)

### Fix frontend-facing architecture docs

- `frontend/README.md:1` has been updated to reflect the mainline integration contract:
  - Next.js UI → FastAPI backend (`/api/v1/*`) via `NEXT_PUBLIC_API_URL`
  - Mainline auth reality: NextAuth session gating only; backend assumes demo `user_id = "1"`
  - If/when the JWT auth worktree is promoted, update this section again to include bearer-token propagation

### Update existing system diagrams to include the real UI shape

- `docs/diagrams/component_architecture.excalidraw:1` should explicitly show:
  - “`/` page as tabbed shell” (`frontend/src/app/page.tsx:1`)
  - “UI primitives (`components/ui`)” vs “domain components (`components/*`)”
  - “Hooks” split: `useTrackerData` (CRUD) + `useCBTAnalysis` (AI analysis)

### Add missing frontend diagrams (recommended)

- **UI Composition diagram** (Mermaid or Excalidraw): `page.tsx` tab-state → dynamic views → hooks → backend API.
- **Auth flow diagram** (if auth worktree is target): `/login` → NextAuth credentials → `/api/v1/auth/login` → bearer token → API calls.
- **Design system diagram** (lightweight): `globals.css` tokens → UI primitives → domain components.

### Reconcile “AI service” documentation

- `frontend/src/lib/ai-client.ts:1` references a separate `/v1/analyze/mood` AI service that does not match the current FastAPI `/api/v1/*` integration path; either document it as deprecated/experimental or remove it from architecture docs to avoid confusion.

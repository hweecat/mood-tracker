# MindfulTrack Architecture: Decoupled AI Stack

This document defines the production-ready architecture for MindfulTrack, utilizing a decoupled Next.js (Frontend) and FastAPI (Backend) stack.

This document reflects the current implementation in the root `frontend/` (Next.js) and `backend/` (FastAPI) directories.

Note: `.worktrees/*` contains experimental/feature snapshots (including an auth/JWT variant). This document is intentionally **not** describing those worktrees.

## Diagrams

Diagram sources (Mermaid) live in `docs/diagrams/`:
* `docs/diagrams/mainline_component_architecture.mmd`
* `docs/diagrams/mainline_frontend_ui_composition.mmd`
* `docs/diagrams/mainline_cbt_analysis_sequence.mmd`

## 1. Technical Stack

*   **Frontend Tier:** Next.js (App Router), TypeScript, Tailwind CSS 4, NextAuth.
*   **Backend Tier:** Python 3.11+, FastAPI, Pydantic, Uvicorn.
*   **Data Tier:** SQLite file (mounted via Docker volume) accessed via `sqlite3` + raw SQL repositories.
*   **AI/ML Tier:** TextBlob for mood-note enrichment; optional Gemini-backed CBT analysis behind `/api/v1/cbt-logs/analyze`.
*   **Observability:** Structured logging + correlation IDs (`X-Correlation-ID`).

## 2. Core Components

*   **Frontend (Next.js):** UI shell + client hooks that call the backend using `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). Example: `frontend/src/hooks/useTrackerData.ts`.
*   **Backend (FastAPI):** REST API under `/api/v1/*`, SQLite persistence, and AI orchestration. Entry: `backend/app/main.py`.
*   **Database (SQLite):** A single DB file (default `data/mood-tracker.db`) mounted into the backend container.
*   **Migrations (Sqitch):** `migrations/` is deployed by the `migrations` service in `docker-compose.yml` before the backend starts.

### 2.1 Component Diagram Overview
The system is organized into three primary layers:
1.  **UI Layer (Next.js):** Manages user state, theme (Neo-brutalist), and data visualization (Recharts).
2.  **API & Logic Layer (FastAPI):** Orchestrates business logic, validates inputs, and manages AI interactions.
3.  **Persistence Layer (SQLite):** Ensures local data sovereignty and atomic transactions.

### 2.2 Data Flow (Mood Check-in)
1.  **Capture:** User submits mood data via `MoodEntryForm`.
2.  **Transmission:** `useTrackerData` hook sends a POST request to `/api/v1/moods/`.
3.  **Enrichment (optional):** Backend runs TextBlob analysis for mood notes and attaches `aiAnalysis` in the response (`backend/app/services/ai_client.py`).
4.  **Persistence:** Repository saves both the raw mood entry and the AI enrichment into SQLite.
5.  **Synchronization:** Frontend refreshes its local state to reflect the new entry and its analysis.

### 2.3 Data Flow (CBT Log)
1. **Capture:** User completes the CBT journaling flow in the UI (`CBTLogForm`).
2. **Mandatory analysis:** The UI triggers cognitive analysis via `POST /api/v1/cbt-logs/analyze` before completing the CBT log flow.
3. **Provider-agnostic model:** The underlying model can be Gemini or another LLM provider; the API contract remains stable.
4. **Persistence:** The CBT log and analysis outputs are persisted in SQLite.

## 3. API Endpoint Schema (v1)

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Moods** | `GET` | `/api/v1/moods/` | Retrieve all mood check-ins for the user. |
| | `POST` | `/api/v1/moods/` | Create a new mood check-in with AI analysis. |
| | `DELETE` | `/api/v1/moods/{id}` | Permanently remove a mood entry. |
| **CBT Logs** | `GET` | `/api/v1/cbt-logs/` | Retrieve all cognitive behavioral therapy logs. |
| | `POST` | `/api/v1/cbt-logs/` | Create a new CBT journal entry. |
| | `PUT` | `/api/v1/cbt-logs/{id}` | Update an existing CBT log (e.g., reframing thoughts). |
| | `DELETE` | `/api/v1/cbt-logs/{id}` | Permanently remove a CBT log. |
| | `POST` | `/api/v1/cbt-logs/analyze` | Run AI cognitive analysis (suggest distortions + reframes). |
| **Users** | `GET` | `/api/v1/users/me` | Fetch current user profile information. |
| | `PUT` | `/api/v1/users/me` | Update user profile details (name, email). |
| **Data** | `GET` | `/api/v1/data/export` | Export data in JSON, CSV, or Markdown format. |
| | `POST` | `/api/v1/data/import` | Bulk import mood and CBT data from JSON. |
| **Health** | `GET` | `/health` | Backend health check. |

## 4. Dependency Graph

### 4.1 Internal Dependencies
*   **Frontend:** `App Router pages` → `Domain components` → `Hooks (useTrackerData, useCBTAnalysis)` → `fetch()` → `Backend API`.
*   **Backend:** `Routes (FastAPI)` → `Repositories (raw SQL)` + `Services (AI)` → `SQLite (sqlite3)`.

### 4.2 External Dependencies
*   **Frontend Stack:**
    *   `Next.js 15` / `React 19`: Framework and UI runtime.
    *   `Tailwind CSS 4`: Styling and Neo-brutalist design system.
    *   `NextAuth`: UI session gating.
    *   `Recharts`: Data visualization for mood trends.
    *   `Lucide React`: Iconography.
*   **Backend Stack:**
    *   `FastAPI`: High-performance API framework.
    *   `sqlite3`: SQLite access (raw SQL repositories).
    *   `TextBlob` / `NLTK`: Local NLP processing for sentiment analysis.
    *   `Pydantic`: Data validation and settings management.
    *   `Uvicorn`: ASGI server.

## 5. Security Posture

*   **Service Decoupling:** Frontend has no direct database access, preventing SQL injection and protecting proprietary prompts.
*   **Internal Networking:** Backend is shielded within a private Docker network, unreachable from the public internet except through the intended frontend routes.
*   **Input Validation:** Mandatory schema enforcement via Pydantic (Backend) and Zod (Frontend).
*   **Correlation Tracking:** Every request is assigned a unique `X-Correlation-ID` for auditing and incident response.

### Current Auth Reality (UI)
* The UI uses NextAuth to gate access to the app and establish a session (`frontend/src/lib/auth.ts`).
* Backend authorization is not enforced in the current root implementation; backend routes generally assume a demo user (`user_id = "1"`).

### Measurable Outcomes (Security)
*   **Vulnerability Surface:** 0 direct public exposure points for the database or internal AI logic.
*   **Auditability:** 100% of API transactions logged with machine-readable metadata and unique IDs.

## 6. Privacy Considerations

*   **Data Minimization:** Only specific text fields required for analysis are sent to the AI service layer.
*   **PII Masking:** (Planned) Middleware to redact user-identifiable information before processing by external LLMs.
*   **Local Persistence:** Users maintain control of their data via the SQLite file stored in their deployment environment.

### Measurable Outcomes (Privacy)
*   **Data Leakage:** 0 user-identifiable metadata (IDs, emails) sent to external AI providers during enrichment.

## 7. Scalability Strategy

*   **Stateless Services:** The FastAPI backend is stateless, allowing for horizontal scaling via replicas.
*   **Repository Pattern:** Abstracts the data layer, enabling a seamless transition from SQLite to PostgreSQL as the user base grows.
*   **AI Request Model:** AI analysis is request/response with timeouts (e.g. `/api/v1/cbt-logs/analyze`), not a background job queue.

### Measurable Outcomes (Scalability)
*   **Throughput:** System handles 50+ concurrent inference requests with < 2.5s end-to-end latency.
*   **Maintenance:** Database migration or service upgrade completes with < 1 hour of scheduled downtime.

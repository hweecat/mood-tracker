# MindfulTrack Architecture: Decoupled AI Stack

This document defines the production-ready architecture for MindfulTrack, utilizing a decoupled Next.js (Frontend) and FastAPI (Backend) stack.

## 1. Technical Stack

*   **Frontend Tier:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, NextAuth.js.
*   **Backend Tier:** Python 3.11+, FastAPI, Pydantic, SQLModel, Uvicorn.
*   **Data Tier:** SQLite (managed by Backend), Docker Volumes for persistence.
*   **AI/ML Tier:** TextBlob (Phase 1), Google Gemini (Phase 2).
*   **Observability:** Structured JSON Logging, Correlation IDs (ContextVars).

## 2. Core Components

*   **Frontend:** Standalone React application handling the UI. Communicates with the backend exclusively via RESTful API calls.
*   **Backend:** Modular Python microservice handling business logic, database persistence, and AI/ML processing.
*   **API Gateway:** Docker Bridge network providing a private communication channel between services.

### 2.1 Component Diagram Overview
The system is organized into three primary layers:
1.  **UI Layer (Next.js):** Manages user state, theme (Neo-brutalist), and data visualization (Recharts).
2.  **API & Logic Layer (FastAPI):** Orchestrates business logic, validates inputs, and manages AI interactions.
3.  **Persistence Layer (SQLite):** Ensures local data sovereignty and atomic transactions.

### 2.2 Data Flow (Mood Check-in)
1.  **Capture:** User submits mood data via `MoodEntryForm`.
2.  **Transmission:** `useTrackerData` hook sends a POST request to `/api/v1/moods/`.
3.  **Enrichment:** FastAPI calls `AIClient` (TextBlob/Gemini) to generate sentiment scores and keywords.
4.  **Persistence:** Repository saves both the raw mood entry and the AI enrichment into SQLite.
5.  **Synchronization:** Frontend refreshes its local state to reflect the new entry and its analysis.

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
| **Users** | `GET` | `/api/v1/users/me` | Fetch current user profile information. |
| | `PUT` | `/api/v1/users/me` | Update user profile details (name, email). |
| **Data** | `GET` | `/api/v1/data/export` | Export data in JSON, CSV, or Markdown format. |
| | `POST` | `/api/v1/data/import` | Bulk import mood and CBT data from JSON. |

## 4. Dependency Graph

### 4.1 Internal Dependencies
*   **Frontend:** `Page Components` → `Hooks (useTrackerData)` → `API Utilities` → `Backend API`.
*   **Backend:** `Routes (FastAPI)` → `Services (AI)` & `Repositories` → `Database (SQLModel/SQLite)`.

### 4.2 External Dependencies
*   **Frontend Stack:**
    *   `Next.js 15` / `React 19`: Framework and UI runtime.
    *   `Tailwind CSS 4`: Styling and Neo-brutalist design system.
    *   `NextAuth.js`: Authentication orchestration.
    *   `Recharts`: Data visualization for mood trends.
    *   `Lucide React`: Iconography.
*   **Backend Stack:**
    *   `FastAPI`: High-performance API framework.
    *   `SQLModel`: ORM for SQLite interaction.
    *   `TextBlob` / `NLTK`: Local NLP processing for sentiment analysis.
    *   `Pydantic`: Data validation and settings management.
    *   `Uvicorn`: ASGI server.

## 5. Security Posture

*   **Service Decoupling:** Frontend has no direct database access, preventing SQL injection and protecting proprietary prompts.
*   **Internal Networking:** Backend is shielded within a private Docker network, unreachable from the public internet except through the intended frontend routes.
*   **Input Validation:** Mandatory schema enforcement via Pydantic (Backend) and Zod (Frontend).
*   **Correlation Tracking:** Every request is assigned a unique `X-Correlation-ID` for auditing and incident response.

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
*   **Async Processing:** AI analysis is performed asynchronously to ensure UI responsiveness.

### Measurable Outcomes (Scalability)
*   **Throughput:** System handles 50+ concurrent inference requests with < 2.5s end-to-end latency.
*   **Maintenance:** Database migration or service upgrade completes with < 1 hour of scheduled downtime.

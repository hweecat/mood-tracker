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

## 3. Security Posture

*   **Service Decoupling:** Frontend has no direct database access, preventing SQL injection and protecting proprietary prompts.
*   **Internal Networking:** Backend is shielded within a private Docker network, unreachable from the public internet except through the intended frontend routes.
*   **Input Validation:** Mandatory schema enforcement via Pydantic (Backend) and Zod (Frontend).
*   **Correlation Tracking:** Every request is assigned a unique `X-Correlation-ID` for auditing and incident response.

### Measurable Outcomes (Security)
*   **Vulnerability Surface:** 0 direct public exposure points for the database or internal AI logic.
*   **Auditability:** 100% of API transactions logged with machine-readable metadata and unique IDs.

## 4. Privacy Considerations

*   **Data Minimization:** Only specific text fields required for analysis are sent to the AI service layer.
*   **PII Masking:** (Planned) Middleware to redact user-identifiable information before processing by external LLMs.
*   **Local Persistence:** Users maintain control of their data via the SQLite file stored in their deployment environment.

### Measurable Outcomes (Privacy)
*   **Data Leakage:** 0 user-identifiable metadata (IDs, emails) sent to external AI providers during enrichment.

## 5. Scalability Strategy

*   **Stateless Services:** The FastAPI backend is stateless, allowing for horizontal scaling via replicas.
*   **Repository Pattern:** Abstracts the data layer, enabling a seamless transition from SQLite to PostgreSQL as the user base grows.
*   **Async Processing:** AI analysis is performed asynchronously to ensure UI responsiveness.

### Measurable Outcomes (Scalability)
*   **Throughput:** System handles 50+ concurrent inference requests with < 2.5s end-to-end latency.
*   **Maintenance:** Database migration or service upgrade completes with < 1 hour of scheduled downtime.

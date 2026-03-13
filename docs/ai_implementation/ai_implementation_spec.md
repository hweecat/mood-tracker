# Technical Specification: Scalable AI/ML Service Integration

## 1. Executive Summary
This document outlines the phased implementation of a hybrid architecture for MindfulTrack. The system integrates a Python-based FastAPI service (AI/ML Tier) with the existing Next.js application (Web Tier) to provide advanced NLP, sentiment analysis, and cognitive behavioral therapy (CBT) assistance. By decoupling the AI logic from the web frontend, we ensure scalability, ease of maintenance, and access to the robust Python data science ecosystem.

## 2. Technical Stack
*   **Web Tier:** Next.js 15, TypeScript, NextAuth.js, Tailwind CSS 4.
*   **AI Tier:** Python 3.12+, FastAPI, Pydantic, Uvicorn.
*   **AI/ML Libraries:** 
    *   `textblob` (Implemented in Phase 1 for sentiment/keywords).
    *   `google-generativeai==0.8.3` (Gemini API for cognitive analysis in Phase 2).
    *   `pydantic-settings==2.6.1` (Environment-based AI configuration in Phase 2).
    *   `nltk` (Used for corpora management).
    *   `pandas` / `scikit-learn` (Planned for Phase 3 trend analysis).
*   **Data Tier:** SQLite (Managed via Backend Repository pattern).
*   **Observability:** Structured JSON Logging (`python-json-logger`), Correlation IDs (`X-Correlation-ID`), PII-free AI audit logs (`ai_audit_logs` table).

## 3. Implementation Roadmap

### Phase 1: Foundation & Enrichment (COMPLETED)
**Goal:** Establish the bridge between services and implement basic mood enrichment.
*   **Infrastructure:**
    *   [x] Initialize `backend/` directory with modular FastAPI structure.
    *   [x] Configure CORS and internal service-to-service communication.
    *   [x] Set up Docker orchestration (`docker-compose`) for both tiers.
*   **Features:**
    *   [x] **Sentiment Analysis:** Extract valence/polarity from mood notes.
    *   [x] **Keyword Extraction:** Identify recurring themes via Noun Phrase extraction.
    *   [x] **Ambient UI:** Implement subtle visual indicators (colored borders/icons) in `HistoryView`.
*   **Database:** 
    *   [x] Migration to add `ai_analysis` column to `mood_entries`.
    *   [x] Backfill 100% of historical logs with AI metadata.

### Phase 2: Cognitive Intelligence (COMPLETED)
**Goal:** Enhance CBT features with logic checks and reframing assistance.
*   **Features:**
    *   [x] **Distortion Detection:** `GeminiClient` classifies cognitive distortions in "Automatic Thoughts" using Google Gemini with structured JSON output.
    *   [x] **Rational Reframing:** AI-generated reframes (Compassionate, Logical, Evidence-based perspectives) via `GeminiClient._generate_reframes()`.
    *   [ ] **Semantic Search:** Planned for a future increment — basic embeddings for finding similar past logs.
*   **Streams:**
    *   [x] **Stream A – The Brain:** Full Gemini API integration, `/analyze` endpoint, prompt versioning.
    *   [x] **Stream B – The Shield:** PII masking middleware, `ai_audit_logs` table, audit service.
    *   [x] **Stream C – The Face:** AI UI components (Analyze button, distortion highlights, reframe carousel).
*   **Technical Detail:**
    *   [x] Integrated `google-generativeai` SDK (`GeminiClient`) with async I/O via `asyncio.to_thread`.
    *   [x] `SafetyHandler` evaluates Gemini `safetyRatings`; triggers HTTP 451 with crisis resources on HIGH probability.
    *   [x] `PromptManager` loads versioned templates from `prompt_versions` DB table with hardcoded fallback.
    *   [x] `AIClientProtocol` adapter pattern enables fallback to `TextBlobClient` when `ENABLE_GEMINI=false`.
    *   [x] `POST /api/v1/cbt-logs/analyze` endpoint with 10s timeout, safety (HTTP 451), timeout (HTTP 504), and general error (HTTP 503) handling.
    *   [x] Database migrations: `prompt_versions` and `ai_audit_logs` tables via Sqitch.
    *   [x] PII masking using regex + name dictionary; masked data is never sent to external AI providers.
    *   [x] All async tests implemented using `anyio` + `httpx.AsyncClient` (37 tests pass: 27 unit + 10 integration).

### Phase 3: Predictive Analytics & Personalization (PLANNED)
**Goal:** Shift from reactive logging to proactive insights.
*   **Features:**
    *   **Trend Prediction:** Identify patterns leading to mood dips using historical data.
    *   **Weekly Synthesis:** Generate natural language summaries of the user's emotional week.
*   **Technical Detail:**
    *   Implement scheduled background tasks for batch processing.

## 4. Architectural Design

### 4.1. Communication Model
*   **RESTful Bridge:** Frontend communicates with the Backend via standard HTTP (POST/GET/PUT/DELETE).
*   **Service Shielding:** The backend is isolated within a private Docker network, unreachable from the public internet except through the frontend proxy.
*   **Decoupling:** The frontend has no direct access to the database; all data operations are mediated by the Backend API.

### 4.2. Security & Privacy
*   **Data Minimization:** Only text fields required for analysis (notes, thoughts) are sent to the AI service layer.
*   **Strict Typing:** Mandatory schema enforcement via Pydantic (Backend) and Zod (Frontend) prevents malformed data entry.
*   **Auditability:** Every transaction is tracked via a unique Correlation ID, enabling end-to-end traceability in logs.

## 5. Success Metrics
*   **Latency:** AI-enriched responses must return to the user in < 3 seconds (currently < 500ms for local models).
*   **Accuracy:** Distortion detection should match human-labeled samples with > 80% precision.
*   **Privacy:** 0% user-identifiable metadata (IDs, emails) leaked to external AI providers.

## 6. Scalability & Future Proofing
*   **Stateless Inference:** The AI tier is stateless, allowing it to scale horizontally with multiple replicas.
*   **Repository Pattern:** Abstracts the data layer, enabling a seamless transition from SQLite to PostgreSQL as the user base expands.
*   **Model Agnosticism:** The AI service uses an "Adapter Pattern" to switch between different LLM providers without modifying business logic.

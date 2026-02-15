# Technical Specification: Scalable AI/ML Service Integration

## 1. Executive Summary
This document outlines the phased implementation of a hybrid architecture for MindfulTrack. The system integrates a Python-based FastAPI service (AI/ML Tier) with the existing Next.js application (Web Tier) to provide advanced NLP, sentiment analysis, and cognitive behavioral therapy (CBT) assistance. By decoupling the AI logic from the web frontend, we ensure scalability, ease of maintenance, and access to the robust Python data science ecosystem.

## 2. Technical Stack
*   **Web Tier:** Next.js 15, TypeScript, NextAuth.js, Tailwind CSS 4.
*   **AI Tier:** Python 3.11+, FastAPI, Pydantic, Uvicorn.
*   **AI/ML Libraries:** 
    *   `textblob` (Implemented in Phase 1 for sentiment/keywords).
    *   `google-generative-ai` (Gemini API for complex reasoning in Phase 2).
    *   `nltk` (Used for corpora management).
    *   `pandas` / `scikit-learn` (Planned for Phase 3 trend analysis).
*   **Data Tier:** SQLite (Managed via Backend Repository pattern).
*   **Observability:** Structured JSON Logging (`python-json-logger`), Correlation IDs (`X-Correlation-ID`).

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

### Phase 2: Cognitive Intelligence (IN PROGRESS)
**Goal:** Enhance CBT features with logic checks and reframing assistance.
*   **Features:**
    *   **Distortion Detection:** Use LLMs (Gemini) to classify cognitive distortions in "Automatic Thoughts."
    *   **Rational Reframing:** Provide AI-generated suggestions for "Rational Responses."
    *   **Semantic Search:** Implement basic embeddings for "Situation" fields to find similar past logs.
*   **Technical Detail:**
    *   Integrate `google-generative-ai` SDK.
    *   Implement PII masking middleware for privacy.

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

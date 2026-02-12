# MindfulTrack Architecture Plan: Hybrid AI Integration

This document defines the scalable architecture for MindfulTrack, utilizing a hybrid Next.js and FastAPI stack to enable robust AI/ML capabilities.

## 1. Core Components

*   **Next.js (Web Tier):** The primary application framework handling the React UI, SSR, Authentication (NextAuth.js), and core business logic.
*   **FastAPI (AI/ML Tier):** A Python-based microservice dedicated to AI processing. It provides high-performance endpoints for NLP, sentiment analysis, and LLM orchestration.
*   **SQLite (Data Tier):** The central relational database. Next.js manages the primary schema, while FastAPI may access it for data-heavy analysis or write AI-specific metadata.
*   **AI Service Adapters:** Modular interfaces within FastAPI for interacting with external LLMs (e.g., Google Gemini, OpenAI) and local ML models (e.g., HuggingFace Transformers).

### Measurable Outcomes
*   **Availability:** Successful initialization of both service tiers with a cross-service health check latency of < 100ms.
*   **Developer Velocity:** Integration of a new AI model into the FastAPI tier takes less than 4 hours of development time.

## 2. Data Flow

1.  **Ingestion:** The user submits a mood entry or CBT log via the Next.js frontend.
2.  **Trigger:** The Next.js API route receives the data and identifies fields requiring AI enrichment (e.g., "Note" or "Automatic Thoughts").
3.  **Processing:** Next.js makes a secure internal HTTP request to the FastAPI service.
4.  **Inference:** FastAPI performs NLP tasks (sentiment scoring, keyword extraction, distortion detection) and returns a structured JSON response.
5.  **Persistence:** Next.js merges the AI metadata with the user's entry and commits it to the SQLite database.
6.  **Presentation:** The frontend displays immediate feedback or stores the insight for the "Insights" dashboard.

### Measurable Outcomes
*   **Performance:** End-to-end data enrichment (from submission to database persistence) completes in < 2.5 seconds for 95% of requests.
*   **Reliability:** 0% data mismatch between the user's input and the AI-generated metadata during high-concurrency testing.

## 3. API Endpoints

### Next.js API (Port 3000)
*   `POST /api/mood`: Accepts mood entries; coordinates with FastAPI for sentiment analysis.
*   `POST /api/cbt`: Accepts CBT logs; coordinates with FastAPI for cognitive distortion identification.
*   `GET /api/insights`: Aggregates entries and AI metadata to provide user-facing trends.

### FastAPI AI Service (Port 8000)
*   `POST /v1/analyze/sentiment`: Evaluates text for emotional valence and intensity.
*   `POST /v1/analyze/cbt-logic`: Identifies cognitive distortions and suggests rational reframing.
*   `POST /v1/generate/summary`: Processes weekly data to create a natural language summary of user well-being.

### Measurable Outcomes
*   **Interface Stability:** 100% adherence to OpenAPI/Swagger specifications, verified by automated contract tests.
*   **Scalability:** FastAPI endpoints maintain < 500ms response time under a simulated load of 20 concurrent inference requests.

## 4. Scalability Strategy

*   **Horizontal Scaling:** Both services are containerized (Docker). As AI demand grows, multiple FastAPI workers can be deployed independently of the frontend.
*   **Asynchronous Tasks:** For heavy AI tasks (e.g., generating monthly reports), the architecture supports a transition to a task queue (e.g., Redis + BullMQ for JS or Celery for Python).
*   **Vector Search Ready:** A clear migration path exists to add `sqlite-vss` or a dedicated vector store (e.g., pgvector) for Retrieval-Augmented Generation (RAG) on user logs.
*   **Database Evolution:** The architecture allows for a seamless transition from SQLite to PostgreSQL as the user base expands beyond single-instance capabilities.

### Measurable Outcomes
*   **Resource Efficiency:** CPU/Memory usage scales linearly with request volume, with no memory leaks detected over 48-hour stress tests.
*   **Upgradeability:** The system can transition to a vector database with < 1 hour of scheduled maintenance and 0% loss of historical logs.

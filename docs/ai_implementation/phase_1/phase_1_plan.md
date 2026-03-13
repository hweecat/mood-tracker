# Implementation Plan: Phase 1 (Foundation & Enrichment) - COMPLETED

This document outlines the specific tasks, testing strategies, and CI/CD considerations for the first phase of the AI/ML service integration.

## 1. Key Tasks & TODOs

### 1.1 Infrastructure & Environment
- [x] **AI Service Setup:**
    - Created `ai/` directory.
    - Initialized `requirements.txt` with `fastapi`, `uvicorn`, `pydantic`, `textblob`, `nltk`, and `python-dotenv`.
    - Implemented `main.py` with health checks, CORS configuration, and automatic NLTK corpora downloading.
- [x] **Next.js Bridge:**
    - Configured `AI_SERVICE_URL` and `AI_SERVICE_KEY`.
    - Created `src/lib/ai-client.ts` to encapsulate fetch logic to the Python service.

### 1.2 Feature Development (FastAPI)
- [x] **NLP Engine:**
    - Implemented `/v1/analyze/mood` endpoint.
    - Integrated `TextBlob` for sentiment polarity (-1.0 to 1.0) and subjectivity.
    - Implemented basic keyword extraction for user notes.
- [x] **Security:**
    - Implemented `X-AI-Key` header-based dependency for service-to-service auth.

### 1.3 Integration (Next.js)
- [x] **Database Migration:**
    - Added `ai_analysis` (TEXT/JSON) column to `mood_entries` via Sqitch (v1.2.1).
- [x] **API Enrichment:**
    - Updated `src/app/api/mood/route.ts` to call the AI service during the `POST` flow.
    - Handled historical data via `ai/scripts/backfill_analysis.py`.
- [x] **UI Integration (Subtle Strategy):**
    - Implemented ambient indicators in `HistoryView.tsx`.
    - Added color-coded left borders (`border-l-4`) and micro-icons (Smile/Frown/Minus) next to timestamps.

## 2. Technical Implementation Details (UI)

### 2.1 Sentiment Threshold Mapping
The UI maps the AI's continuous `-1.0 to 1.0` polarity score into three discrete categories:
*   **Positive (> 0.3):** `#a3e635` (lime-400), `Smile` icon.
*   **Negative (< -0.3):** `#f43f5e` (rose-500), `Frown` icon.
*   **Neutral (-0.3 to 0.3):** `#67e8f9` (cyan-300), `Minus` icon.

### 2.2 UX Patterns
*   **Ambient Indicators:** A 4px solid left border on history cards provides emotional context without increasing visual noise.
*   **Progressive Disclosure:** Micro-icons next to the timestamp are low-opacity, becoming prominent only when the parent card is hovered.

## 3. Success Criteria for Phase 1 (Verified)
1. [x] FastAPI service is running and reachable by Next.js.
2. [x] Mood entries are enriched with a `sentiment_score` and `keywords`.
3. [x] Database schema supports AI metadata.
4. [x] Backfilled all historical entries with AI analysis.
5. [x] UI reflects sentiment analysis through subtle, accessible ambient indicators.

# Technical Specification: Scalable AI/ML Service Integration

## 1. Executive Summary
This document outlines the phased implementation of a hybrid architecture for MindfulTrack. The system integrates a Python-based FastAPI service (AI/ML Tier) into the existing Next.js application (Web Tier) to provide advanced NLP, sentiment analysis, and cognitive behavioral therapy (CBT) assistance.

## 2. Technical Stack
*   **Web Tier:** Next.js 15, TypeScript, NextAuth.js, Tailwind CSS.
*   **AI Tier:** Python 3.12, FastAPI, Pydantic, Uvicorn.
*   **AI/ML Libraries:** 
    *   `google-generative-ai` (Planned for Phase 2).
    *   `textblob` (Implemented in Phase 1 for sentiment/keywords).
    *   `nltk` (Used for corpora management).
*   **Data Tier:** SQLite (shared via direct access in backfill scripts and API-mediated during runtime).

## 3. Implementation Status

### Phase 1: Foundation & Enrichment (COMPLETED)
*   **Infrastructure:** FastAPI service established with API Key authentication.
*   **Feature:** Automatic sentiment and keyword extraction for every mood note.
*   **UI:** "Subtle Integration" implemented with ambient color-coded borders and micro-icons in the History View.
*   **Backfill:** 100% of historical mood entries analyzed and updated.

### Phase 2: Cognitive Intelligence (IN PROGRESS)
**Goal:** Enhance CBT features with logic checks and reframing assistance.
*   **Planned Features:**
    *   **Distortion Detection:** Use LLMs to classify cognitive distortions in "Automatic Thoughts."
    *   **Rational Reframing:** Provide AI-generated suggestions for "Rational Responses."
*   **Upcoming Technical Work:** Integration of Google Gemini API for complex text reasoning.

### Phase 3: Predictive Analytics & Personalization (PLANNED)
**Goal:** Shift from reactive logging to proactive insights.

## 4. Architectural Design (Implemented)

### 4.1. Communication Model
*   **Synchronous Bridge:** Next.js `POST /api/mood` calls FastAPI `POST /v1/analyze/mood` before database persistence.
*   **Security:** Service-to-service communication secured via `X-AI-Key` header.
*   **Fault Tolerance:** The Next.js client is designed to handle FastAPI timeouts or errors gracefully, ensuring user logs are saved even if analysis fails.

### 4.2. UI Design System (Ambient Sentiment)
*   **Logic:** Continuous sentiment polarity is mapped to discrete color tokens (`lime-400`, `rose-500`, `cyan-300`).
*   **Implementation:** `border-l-4` on `HistoryView` cards.
*   **Accessibility:** Sentiment is conveyed via both color and unique icons (`Smile`, `Frown`, `Minus`) to support color-blind users.

## 5. Success Metrics
*   **Latency:** Average AI enrichment response time < 200ms (measured locally).
*   **Data Consistency:** `ai_analysis` JSON structure is standardized across all historical and new entries.

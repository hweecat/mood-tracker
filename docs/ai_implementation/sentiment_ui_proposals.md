# UI/UX Proposals: Integrating AI Sentiment Insights

This document outlines the design strategy for visualizing AI-generated sentiment data.

## 1. Selected Strategy: Ambient Indicators (Implemented)
Based on a comparison of Explicit vs. Subtle designs, the **Subtle (Ambient)** strategy was selected and implemented to reduce mental clutter and maintain a therapeutic environment.

### Implementation Details:
*   **Location:** `src/components/HistoryView.tsx`
*   **Mechanism:** `border-l-4` (Left Border) on Mood Entry cards.
*   **Colors:**
    - Positive: `lime-400` (Grounded in brightness)
    - Negative: `rose-500` (Warning/Emotional weight)
    - Neutral: `cyan-300` (Stability)
*   **Micro-Icons:** Placed next to the timestamp, appearing at full opacity on card hover.

## 2. Future Visualizations (Planned)

### 2.1 Sentiment-Enriched Mood Chart
*   **Visuals:** Use `sentiment_score` to determine the color of the data points on the Recharts line chart.
*   **Status:** Planned for Phase 2.

### 2.2 Thematic Word Cloud
*   **Visuals:** Neo-brutalist blocks displaying top keywords from `aiAnalysis.keywords`.
*   **Status:** Planned for Phase 3.

### 2.3 Subjectivity Meter: "Fact vs. Feeling"
*   **Visuals:** A horizontal gauge in the entry details view.
*   **Status:** Planned for Phase 2 (CBT integration).

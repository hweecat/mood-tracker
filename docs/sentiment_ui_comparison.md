# Sentiment UI Design: Explicit vs. Subtle Integration

## Comparison Summary

| Feature | Strategy A (Explicit) | Strategy B (Subtle) |
| :--- | :--- | :--- |
| **Visual Weight** | High (New component) | Low (Border change) |
| **Mental Load** | Immediate | On-demand |
| **Accessibility** | Built-in (Icons/Text) | Via Micro-indicators |
| **Selection Status** | Rejected | **IMPLEMENTED** |

## Implementation Details (Strategy B)

Strategy B was implemented in **Phase 1** to provide a clean, non-intrusive experience.

### Technical Implementation:
- **Component:** `HistoryView.tsx`
- **Logic:**
  ```typescript
  if (aiAnalysis.sentiment_score > 0.3) {
    sentimentColor = 'border-l-lime-400';
    SentimentIcon = Smile;
  } else if (aiAnalysis.sentiment_score < -0.3) {
    sentimentColor = 'border-l-rose-500';
    SentimentIcon = Frown;
  } else {
    sentimentColor = 'border-l-cyan-300';
    SentimentIcon = Minus;
  }
  ```
- **Visual Outcome:** A 4px color-coded left border and a context-aware micro-icon next to the timestamp.
- **Accessibility:** Icons ensure that sentiment is distinguishable without relying solely on color.

## Next Steps
The subtle indicators provide the foundation for future "Progressive Disclosure" features, such as hovering over a card to see specific AI-extracted keywords or a subjectivity score.

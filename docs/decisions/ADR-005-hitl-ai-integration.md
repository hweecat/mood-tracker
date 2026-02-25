# ADR-005: Human-in-the-Loop (HITL) AI Integration

## Context
Phase 2 introduces AI-driven cognitive analysis. A purely automated system that "diagnoses" distortions or "replaces" thoughts risks reducing the user's therapeutic agency and could be clinically counterproductive, as the value of CBT lies in the user's active cognitive effort.

## Decision
We will implement a "Suggest & Select" interaction model. The AI functions as a **thinking partner**, not a decision-maker.

1.  **Transient Suggestions**: AI analysis results (distortions and reframes) are delivered as *suggestions* via a dedicated `CBTAnalysisResponse` schema.
2.  **Explicit User Confirmation**: No AI suggestion is automatically saved to the user's primary record. The user must explicitly click or select a suggestion to "confirm" it.
3.  **Differentiated Storage**: The `CBTLog` schema will store the user's final selections in the primary `distortions` and `rational_response` fields, while maintaining a reference to the `ai_suggested_distortions` for longitudinal analysis of AI helpfulness.
4.  **UI Visualization**: Suggested distortions will be visually highlighted in the UI (e.g., using "Ambient Indicators" or distinct borders) to distinguish them from the user's manual identifications.

## Rationale
- **Therapeutic Agency**: Ensures the user remains the primary analyst of their own thoughts.
- **Safety**: Minimizes the impact of AI "hallucinations" or incorrect classifications by requiring a human filter.
- **Data Quality**: Captures a clear signal of when AI is actually providing value (Suggestion → Selection).

## Tradeoffs
- **User Effort**: Requires more clicks than a fully automated path.
- **UI Complexity**: The form must now handle two states (suggested vs. confirmed) for the same data points.

## Revisit Trigger
- User feedback indicates the "Suggest & Select" flow is too high-friction.
- Analysis shows a < 10% conversion rate from suggestions to selections, indicating poor AI quality or UI discoverability.

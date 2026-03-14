# ADR-008: AI Quality Constraints & Distortion Normalization

## Status: Supersedes ADR-002 (extends)

## Context
ADR-002 established the use of structured JSON output. Phase 2 implementation revealed the need for further qualitative constraints to ensure clinical safety, UI consistency, and seamless backend/frontend integration.

## Decision
We implement strict qualitative and structural constraints on AI-generated content:

1.  **Reframe Quantity Constraint**: Exactly 3 rational reframes are generated per request, representing distinct perspectives: Compassionate, Logical, and Evidence-based.
2.  **Distortion Normalization**: All cognitive distortion names are normalized to **Title Case** (e.g., "All-or-Nothing Thinking") at the backend `constants.py` level. This ensures direct matching with frontend TypeScript types and UI highlights.
3.  **Safety Tiering**: Multi-tier safety evaluation based on Gemini's `safetyRatings`. High-harm probability content triggers a `SafetyException` that blocks the AI response and provides immediate `CRISIS_RESOURCES`.

## Rationale
- **UI/UX Consistency**: A fixed number of reframes prevents UI layout shifts and ensures a predictable user experience.
- **Cognitive Load Management**: Providing exactly 3 high-quality reframes avoids overwhelming the user during periods of emotional distress.
- **Direct Matching**: Normalizing distortion names to Title Case eliminates the need for complex, case-insensitive string matching or mapping tables in the frontend.
- **Safety First**: Explicit safety tiering ensures the tool remains clinically safe and provides immediate resources during crises.

## Tradeoffs
- **Model Constraint**: Constraining the model to exactly 3 reframes may occasionally omit a relevant fourth perspective, but the gain in UI stability and user focus is prioritized.

## Revisit Trigger
- User feedback indicating the 3-reframe constraint is insufficient.
- Introduction of new cognitive distortion categories requiring further normalization.

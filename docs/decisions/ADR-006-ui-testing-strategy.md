# ADR-006: Comprehensive UI Testing Strategy for AI Features

## Context
Phase 2 introduces complex, multi-step state machines (the 6-step CBT form) and non-deterministic AI outputs. Manual verification is no longer sufficient to ensure stability and "Premium Quality" (Visual Excellence).

## Decision
We implement a three-layered testing strategy for all AI-powered UI components.

1.  **Logic & Lifecycle (Unit)**: `vitest` with `renderHook` to verify the `useCBTAnalysis` hook. Mocks `global.fetch` to simulate various API responses (Success, Safety 451, Timeout 504, Malformed JSON).
2.  **State Machine & HITL (Integration)**: `vitest` with `React Testing Library` to verify the 6-step `CBTLogForm`. Ensures that AI suggestions are correctly stored, displayed with amber highlights, and can be selected into the user's manual response.
3.  **Visual Excellence (E2E VRT)**: `Playwright` for Visual Regression Testing (VRT). Captures and compares snapshots of the glassmorphism UI, gradients, and dark mode variants to prevent "design regressions."

## Rationale
- **Resilience**: Unit tests ensure the frontend fails gracefully even when the external Gemini API is down or times out.
- **Complexity Management**: Integration tests verify the state machine transitions and "Human-in-the-Loop" data flow.
- **Design Integrity**: VRT protects the premium aesthetic, which is a key product differentiator.

## Tradeoffs
- **Maintenance**: Snapshot tests require periodic updates when intentional design changes occur.
- **Execution Time**: Playwright VRT adds time to the CI pipeline, but it is necessary for maintaining the visual bar.

## Revisit Trigger
- CI pipeline time exceeds 15 minutes due to test bloat.
- High number of "false positive" visual regression failures.

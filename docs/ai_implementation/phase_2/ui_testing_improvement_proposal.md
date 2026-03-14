# Proposal: Improving UI Testing for AI Features

## 1. Current State Assessment
- **Unit/Integration**: Vitest + JSDOM is configured but coverage is sparse (limited to `ThemeProvider` and `useTrackerData`).
- **E2E**: Selenium + Axe provides solid baseline login and accessibility checks.
- **Gap**: The complex **Step-by-Step AI CBT Flow** is currently untested at the logic, integration, and E2E layers.

---

## 2. Proposed Testing Strategy

### A. AI Hook & Lifecycle Testing
**Focus**: Ensure the frontend handles AI service volatility (latency, safety triggers, errors) gracefully.
- **Tool**: Vitest
- **Improvements**:
    - **Hook Integration**: Write tests for `useCBTAnalysis` mocking `global.fetch`.
    - **Scenario Coverage**: Test "Happy Path", "Safety Exception (451)", "AI Timeout (504)", and "Malformed JSON".
    - **State Verification**: Confirm `loading` becomes `true` immediately upon call and `error` is cleared on retry.

### B. HITL Logic & State Machine (Component Level)
**Focus**: Validate the "Suggest & Select" pattern in the 6-step CBT form.
- **Tool**: Vitest + React Testing Library
- **Improvements**:
    - **Step Transitions**: Verify that clicking "Seek AI Perspective" correctly triggers the loading state and stays on Step 2 until finished.
    - **HITL Verification**: Test that selecting an AI-highlighted distortion (amber border) adds it to the user's `distortions` state but *removes* it from the visual "needs highlighting" pool.
    - **Reset Logic**: Ensure that navigating back to Step 2 and changing the thought clears previous AI suggestions to prevent stale data.

### C. Visual Regression Testing
**Focus**: Protect the "Visual Excellence" and premium design tokens.
- **Tool**: Playwright (Recommended) or Selenium Screen Comparison
- **Improvements**:
    - **Snapshot Testing**: Capture the glassmorphism and gradient states of the AI suggestions.
    - **Dark Mode Verification**: Ensure the "AI Brain Icon" and amber highlights have proper contrast in both light and dark themes.

### D. Enhanced Accessibility (HITL Focus)
**Focus**: Ensure the AI integration is usable by everyone.
- **Tool**: `axe-core` (integrated into existing Selenium suite)
- **Improvements**:
    - **Live Region Updates**: Verify that when AI results appear, screen readers are notified (using `aria-live`).
    - **Keyboard Navigation**: Ensure the "Reframe Carousel" (Step 4) is fully navigable via Tab and Arrow keys.

---

## 3. Implementation Roadmap

### Phase 1: Logic & Lifecycle (High Impact)
1. Add `frontend/src/hooks/__tests__/useCBTAnalysis.test.ts`.
2. Mock the backend `analyze` response using Vitest's `vi.mock`.

### Phase 2: Flow & Integration
1. Create `frontend/__tests__/CBTLogForm.test.tsx`.
2. Simulate a full 6-step journey with mocked AI success.

### Phase 3: Premium Polish
1. Introduce Playwright for screenshot-based visual regression.
2. Add "Motion-Reduced" test variants to ensure animations (pulse, slide-in) don't affect core usability.

> [!TIP]
> Prioritize **Phase 1** (Hook Testing) first. Because the Gemini API is external and unpredictable, ensuring the frontend "fails gracefully" is the most critical quality-of-life improvement for the user.

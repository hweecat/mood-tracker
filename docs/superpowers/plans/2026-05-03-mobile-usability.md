# Mobile Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the CBT journaling and AI suggestion flow comfortable and reliable on mobile devices.

**Architecture:** Refactor the CBT form into smaller mobile-first sections/components while preserving existing data hooks. Add explicit accept/edit/dismiss controls for AI reframes and action plans, stable sticky navigation, and responsive tests.

**Tech Stack:** Next.js, React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library, Playwright.

---

## Worktree

- Path: `.worktrees/mobile-usability`
- Branch: `codex/mobile-usability`
- Depends on: CBT response contract from `codex/cbt-quality-action-plans`.

## File Ownership

- Modify: `frontend/src/components/CBTLogForm.tsx`
- Create: `frontend/src/components/cbt/CBTStepShell.tsx`
- Create: `frontend/src/components/cbt/AISuggestionPanel.tsx`
- Create: `frontend/src/components/cbt/ActionPlanPicker.tsx`
- Modify: `frontend/src/components/HistoryView.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/types/index.ts`
- Modify/Create: `frontend/__tests__/CBTLogForm.test.tsx`
- Create: `frontend/__tests__/AISuggestionPanel.test.tsx`
- Create/Modify: `frontend/e2e/visual/vrt_cbt_flow.spec.ts`

## Requirements

- No horizontal body overflow at 320px, 375px, 390px, 768px, or desktop widths.
- Primary actions are visible and tappable without hover.
- Tap targets are at least 44px high.
- Long labels and user-entered text wrap without clipping.
- AI suggestion cards expose accept, edit, and dismiss states.
- The flow remains usable when analysis is loading, unavailable, timed out, or safety-blocked.
- Do not add marketing-page content; keep the app as the first screen.

## Tasks

### Task 1: Add Mobile Regression Tests For CBT Form

- [ ] Write failing tests in `frontend/__tests__/CBTLogForm.test.tsx`.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CBTLogForm } from '@/components/CBTLogForm';

test('keeps primary navigation available through the CBT mobile flow', async () => {
  const user = userEvent.setup();
  render(<CBTLogForm onSubmit={vi.fn()} />);

  expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
  await user.type(screen.getByLabelText(/situation/i), 'A difficult work conversation');
  await user.click(screen.getByRole('button', { name: /next/i }));

  expect(screen.getByRole('button', { name: /back/i })).toBeVisible();
  expect(screen.getByRole('button', { name: /seek ai perspective/i })).toBeVisible();
});
```

- [ ] Run `cd frontend; npm test -- CBTLogForm.test.tsx`.
- [ ] Verify the test fails for the current accessible names or behavior if necessary, then adjust only the test setup until it fails for the intended UI gap.

### Task 2: Split CBT Step Shell

- [ ] Create `CBTStepShell.tsx` to own title, progress, content, and sticky action area.
- [ ] Refactor `CBTLogForm.tsx` one step at a time while keeping tests green.
- [ ] Use responsive padding and radii that fit mobile screens.
- [ ] Keep local draft persistence behavior unchanged.

### Task 3: AI Suggestion Panel

- [ ] Write tests for accepting, editing, and dismissing a reframe suggestion.
- [ ] Create `AISuggestionPanel.tsx` for distortions and reframes.
- [ ] Ensure buttons use icons from `lucide-react` where appropriate and text labels remain accessible.
- [ ] Store accepted suggestion ids in form state for audit feedback.

### Task 4: Action Plan Picker

- [ ] Write tests for selecting an AI action plan and editing it before submit.
- [ ] Create `ActionPlanPicker.tsx`.
- [ ] Integrate `actionPlans` from `useCBTAnalysis`.
- [ ] Preserve user-authored action plan text as final source of truth.

### Task 5: Mobile Visual And Interaction Checks

- [ ] Update Playwright visual flow to check widths 320, 375, 390, 768, and 1280.
- [ ] Assert no horizontal overflow:

```ts
const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
expect(hasOverflow).toBe(false);
```

- [ ] Verify tap targets for visible buttons are at least 44px tall in the CBT flow.
- [ ] Run `cd frontend; npm test; npx playwright test e2e/visual/vrt_cbt_flow.spec.ts`.

## Acceptance Criteria

- CBT mobile flow has no horizontal overflow at required widths.
- AI suggestions support accept/edit/dismiss.
- Action plan suggestions support accept/edit.
- Existing draft persistence and submit behavior still pass tests.
- Playwright mobile checks pass or documented screenshots show remaining issues before merge.


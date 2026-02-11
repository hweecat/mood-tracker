# MindfulTrack Development Guidelines

This document defines the code style, architectural patterns, and review criteria for the MindfulTrack project. All contributors (human or AI) should adhere to these standards to ensure consistency and maintainability.

## 🎯 Core Philosophy
- **Neo-brutalist Aesthetic**: Maintain high contrast, thick borders, and bold shadows.
- **Type Safety First**: End-to-end type safety using TypeScript and Zod.
- **Performance**: Minimize client-side weight using dynamic imports and efficient state management.
- **Accessibility**: WCAG 2.1 compliance is a non-negotiable standard.

## 🛠️ TypeScript & Coding Standards
- **Strict Typing**: Avoid `any`. Use interfaces for data models and types for component props/unions.
- **Functional Style**: Prefer functional programming patterns (immutability, pure functions).
- **Naming Conventions**:
  - Components: `PascalCase` (e.g., `MoodChart.tsx`).
  - Hooks: `useCamelCase` (e.g., `useTrackerData.ts`).
  - Utilities/Variables: `camelCase`.
  - Constants: `SCREAMING_SNAKE_CASE`.

## ⚛️ React & Component Patterns
- **Atomic UI**: Low-level components must reside in `src/components/ui/` and utilize `class-variance-authority` (CVA) for variant management.
- **Separation of Concerns**: Keep business logic in custom hooks. Components should focus on presentation.
- **Hydration Safety**: 
  - Never nest `<div>` inside `<p>`.
  - Use `<span>` for inline badges/pills.
  - Use `mounted` state checks for browser-only features (e.g., theme switching).
- **Dynamic Imports**: Use `next/dynamic` for components with heavy dependencies (e.g., Recharts) or those below the fold.

## 🎨 Styling & UI (Tailwind CSS 4)
- **Utility First**: Favor Tailwind utilities over custom CSS.
- **Design Tokens**: Use brand-specific tokens defined in `globals.css` (e.g., `shadow-neo`, `border-width-neo`).
- **Conditional Classes**: Always use the `cn()` utility (tailwind-merge + clsx) for merging classes.
- **Neo-brutalist Pattern**:
  - Borders: `border-2` or `border-4`.
  - Shadows: `shadow-neo`, `shadow-neo-lg`.
  - Animation: Use `active:scale-95` and `active:shadow-none` for interactive feedback.

## 💾 Data Management & State
- **State Strategy**: Use local state for UI and the `useTrackerData` hook for domain data.
- **Optimistic UI**: Implement optimistic updates in hooks to ensure the UI feels instantaneous.
- **API Communication**: 
  - Use `src/lib/api-utils.ts` helpers (`apiSuccess`, `apiError`).
  - Every API route must validate input using a Zod schema.
  - Role-Based Access Control (RBAC) must be checked via `getAuthContext()`.

## 🧪 Testing & Quality Assurance
- **Coverage**:
  - Logic/Hooks: Vitest unit tests.
  - UI: React Testing Library.
  - Critical Flows: Selenium WebDriver E2E tests.
- **Accessibility Testing**: Run `axe-core` checks as part of the E2E suite.
- **Linting**: No commit should be made without passing `npm run lint`.

## 🔍 Review Criteria
- **Security**: Check for proper RBAC and Zod validation on all new endpoints.
- **A11y**: Verify semantic HTML, aria-labels, and color contrast.
- **Redundancy**: Ensure new styles leverage existing `@theme` tokens instead of magic values.
- **Maintainability**: Ensure complex logic is properly documented or extracted into readable utilities.

## 📦 Third-Party Libraries
- Prefer established project libraries: `lucide-react`, `date-fns`, `recharts`, `zod`.
- Consult before adding new dependencies to keep the bundle lean.

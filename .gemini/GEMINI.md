# MindfulTrack Development Guidelines

This document defines the code style, architectural patterns, and review criteria for the MindfulTrack project.

## 🎯 Core Philosophy
- **Decoupled Architecture**: Strict separation between Next.js (Frontend) and FastAPI (Backend).
- **Type Safety First**: End-to-end safety using TypeScript (Frontend) and Pydantic/SQLModel (Backend).
- **Security by Design**: Principle of least privilege, internal networking, and strict data validation.
- **Privacy First**: Data minimization and planned PII masking for AI operations.
- **Neo-brutalist Aesthetic**: High contrast, thick borders, bold shadows.

## 🛠️ Stack & Standards

### TypeScript (Frontend)
- **Strict Typing**: Avoid `any`. Use interfaces for data models and types for component props.
- **Naming**: `PascalCase` for components, `camelCase` for variables/hooks, `SCREAMING_SNAKE_CASE` for constants.
- **Functional Style**: Prefer functional programming patterns (immutability, pure functions).
- **Hydration Safety**: Use `mounted` state checks for browser-only features.

### Python / FastAPI (Backend)
- **Framework**: FastAPI (Python 3.11+).
- **Type Hints**: Mandatory type hints for all function signatures and variables.
- **Schemas**: Use Pydantic models with `alias_generator=to_camel` for API responses to maintain idiomatic code in both stacks.
- **Structure**:
  - `api/v1/routes/`: API entry points.
  - `repositories/`: Data access layer (SQL logic).
  - `services/`: Business logic and AI integrations.
  - `schemas/`: Pydantic models (DTOs).
- **Database**: SQLite (via `sqlite3` with `check_same_thread=False`).

## ⚛️ React & Component Patterns
- **Atomic UI**: Located in `frontend/src/components/ui/` using `class-variance-authority` (CVA).
- **Sentiment Indicators**: Use "Ambient Indicators" (colored left borders and micro-icons).

## 💾 Data Management & State
- **Single Source of Truth**: The FastAPI backend manages the SQLite database.
- **Persistence**: Data stored in host's `./data` directory via Docker volumes.
- **Idempotency**: All DELETE and PUT operations must be idempotent.

## 🔒 Security & Privacy
- **Input Validation**: Every API route must validate input using Pydantic (Backend) or Zod (Frontend).
- **PII Protection**: Mask or redact personally identifiable information before processing via external AI providers.
- **Internal Networking**: Backend services are shielded within a private Docker bridge network.

## 🔍 Review Criteria
- **Logging**: Structured JSON output with Correlation IDs for every request.
- **Contrast**: Maintain WCAG 2.1 compliance for all UI elements.
- **Redundancy**: No duplicate logic; extract common functionality into Services or Utilities.
- **Tests**: Any change to API endpoints, data models, or core business logic MUST be accompanied by corresponding updates to unit and/or E2E tests to prevent regressions.

## 🛠️ Technical Constraints & CI Best Practices

### Next.js Standalone Mode
- **Asset Requirement**: When using `output: 'standalone'`, the `.next/static` and `public` directories must be manually copied into the standalone folder for production execution outside of the standard Docker build.
- **Execution**: Run via `node server.js` from within the standalone directory, not `next start`.

### Hydration Safety in E2E Tests
- **Synchronization**: Use the `data-hydrated` attribute on root forms/containers to signal to E2E test runners (Selenium/Playwright) that React event handlers are active.
- **Wait Logic**: Always wait for `data-hydrated="true"` before interacting with input elements to prevent default browser behavior (e.g., GET submissions).

### Backend Stability
- **SQLite Threading**: Always use `check_same_thread=False` in the `sqlite3` connection for FastAPI, as requests are handled in a thread pool.
- **Service Bridge**: Use `API_SERVER_URL` for server-side data fetching within internal networks (Docker/CI) to avoid `ECONNREFUSED` on `localhost`.
- **Health Checks**: Support both `GET` and `HEAD` methods on `/health` for compatibility with various CI orchestration tools.

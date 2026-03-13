# Testing Strategy: Phase 2 — The Brain (Gemini Integration)

## 1. Overview
This document defines the testing requirements for the AI-driven "Brain" component of MindfulTrack. The goal is to move beyond structural verification (checking if endpoints exist) to behavioral verification (ensuring clinical and operational integrity).

## 2. Testing Requirements

### 2.1 Clinical Constraint Enforcement
The system MUST return exactly one of the 13 predefined cognitive distortions.
- **Verification**: Tests must verify that any distortion returned by the AI that is not in the `COGNITIVE_DISTORTIONS` constant list is either mapped to a "Generic" category or discarded to maintain schema integrity.

### 2.2 Configuration & Graceful Degradation
The system MUST support toggling AI features without crashing.
- **Verification**: Tests must verify that `get_ai_client()` correctly respects `ENABLE_GEMINI=false` and falls back to `TextBlobClient` or a neutral responder.

### 2.3 Prompt Resilience
AI prompts are versioned and stored in the database.
- **Verification**: Tests must verify that missing or malformed templates (e.g., missing `{situation}` placeholder) are handled gracefully, defaulting to the hardcoded safe templates.

### 2.4 Operational Auditability
All AI interactions must be traceable for latency and safety.
- **Verification**: Tests must verify that `latency_ms`, `prompt_version`, and `request_id` are accurately captured and passed to the `ai_audit_logs` persistence layer.

### 2.5 Non-Blocking Async Behavior
AI SDK calls (which are often synchronous/IO-bound) must not block the main FastAPI event loop.
- **Verification**: While difficult to test via unit tests, code review must confirm `asyncio.to_thread` usage, and integration tests should verify responsiveness under simulated load.

## 3. Test Suites

| Category | Location | Focus |
| :--- | :--- | :--- |
| **Unit (Services)** | `backend/tests/services/` | Logic isolation for `SafetyHandler`, `PromptManager`, and `GeminiClient`. |
| **Unit (Factory)** | `backend/tests/services/test_ai_client_factory.py` | Configuration toggling and adapter selection. |
| **Integration** | `backend/tests/integration/` | Schema contract verification and HTTP error mapping. |

## 4. Maintenance
Any update to `backend/app/core/constants.py` (e.g., adding a new distortion) MUST be accompanied by an update to the constraint enforcement tests.

# Phase 2: Cognitive Intelligence - Changelog

This document tracks the incremental changes made during the implementation of Phase 2 across parallel development streams.

## [2026-02-25] - Stream C: AI UI Components (The Face) - COMPLETED

### Added
- **New Hook**: `frontend/src/hooks/useCBTAnalysis.ts`
    - Orchestrates the `POST /api/v1/cbt-logs/analyze` lifecycle.
    - Handles `loading`, `error`, and `analysis` (suggestions/reframes) states.
- **AI UI Elements**:
    - **Analyze Button**: Interactive trigger in `CBTLogForm` (Step 2) with a pulsate loading state.
    - **Distortion Highlighting**: Step 3 now visually distinguishes AI suggestions using a `Brain` icon and amber borders.
    - **Reframe Carousel**: Step 4 includes a horizontal scroll of AI-generated perspectives (Compassionate, Logical, etc.) that can be selected to auto-populate the textarea.

### Changed
- **Type Definitions**: `frontend/src/types/index.ts`
    - Added `DistortionSuggestion`, `RationalReframe`, and `CBTAnalysisResponse`.
    - Expanded `CBTLog` to include `aiSuggestedDistortions` and `aiAnalysis` for HITL tracking.
- **Form Logic**: `frontend/src/components/CBTLogForm.tsx`
    - Integrated `useCBTAnalysis`.
    - Implemented "Suggest & Select" logic for distortions and reframes.
    - Added state persistence for AI suggestions during the journaling session.

### Technical Notes
- **HITL Pattern**: The UI explicitly separates AI suggestions from user selections. AI data is stored in `aiSuggestedDistortions` while user confirmations go into the standard `distortions` field.
- **Latency Handling**: Skeleton-like pulsate animations are used on the "Analyze" button to manage the expected < 3s Gemini latency.

---
**Status**: Frontend is ready for integration. Pending Backend API implementation (`/analyze` endpoint).

## [2026-02-25] - Stream A: Gemini Integration (The Brain) - IN PROGRESS

### Added
- **Core AI Config**: `backend/app/core/ai_config.py`
    - Environment-based configuration using `pydantic-settings`.
    - Support for `gemini_api_key`, `model`, `temperature`, and `timeout`.
- **CBT Constants**: `backend/app/core/constants.py`
    - Defined 13 cognitive distortions, safety fallback messages, and crisis resources.
- **Safety Module**: `backend/app/services/safety_handler.py`
    - Evaluation logic for Gemini `safetyRatings`.
    - Multi-tier safety results (NEGLIGIBLE, LOW, HIGH) with specific fallback messages.
- **Prompt Versioning**: 
    - **Model**: `backend/app/models/prompt_version.py` (SQLModel).
    - **Manager**: `backend/app/services/prompt_manager.py` for loading templates from DB or code.
    - **Migration**: `migrations/deploy/add_prompt_versions.sql` to track prompt evolution.

### Changed
- **Dependencies**: `backend/pyproject.toml`
    - Added `google-generativeai` and `pydantic-settings`.
    - Bumped backend version to `0.2.0`.

### Technical Notes
- **Database Architecture**: Added `prompt_versions` table to enable ADR-004 (Prompt Versioning).
- **Safety First**: Implemented a centralized `SafetyHandler` to ensure all AI responses are screened for harm probability before reaching the user.

---
**Status**: Core infrastructure for Gemini is complete. Implementation of `GeminiClient` and `/analyze` endpoint is next.

## [2026-03-02] - Stream A: Gemini Integration (The Brain) - COMPLETED

### Added
- **Gemini Client**: `backend/app/services/gemini_client.py`
    - Full async CBT analysis with distortion detection and rational reframing.
    - Retry logic with exponential backoff (max 2 retries).
    - Safety evaluation for all AI responses.
    - Structured JSON response parsing with proper error handling.
    - PII-free audit logging to `ai_audit_logs` table.
    - Custom exceptions: `SafetyException` and `ParseException`.
- **Adapter Pattern**: `backend/app/services/ai_client.py` (Refactored)
    - `AIClientProtocol` abstract base class for provider flexibility.
    - `TextBlobClient` implementing the protocol.
    - `get_ai_client()` factory function with automatic fallback.
    - Legacy `analyze_mood_note()` function for backward compatibility.
- **API Endpoint**: `backend/app/api/v1/routes/cbt_logs.py`
    - `POST /api/v1/cbt-logs/analyze` endpoint for AI-powered cognitive analysis.
    - 10-second timeout with proper error handling.
    - HTTP 451 status for safety exceptions with crisis resources.
    - HTTP 504 status for timeout errors.
    - HTTP 503 status for general service unavailability.

### Changed
- **No breaking changes**: All new functionality is additive.

### Technical Notes
- **Async Architecture**: All AI calls use async/await with `asyncio.to_thread()` for non-blocking I/O.
- **Error Handling**: Comprehensive exception handling at service and API layers.
- **Safety Layer**: Centralized safety evaluation ensures all AI responses are screened before reaching the user.

---
**Status**: Backend implementation complete. Ready for integration testing with frontend.

## [2026-03-02] - Stream A: Gemini Integration (The Brain) - COMPLETED

### Added
- **Gemini Client**: `backend/app/services/gemini_client.py`
    - Core Gemini integration for distortion detection and rational reframing
    - Structured JSON output parsing with `application/json` mime type
    - Retry logic with exponential backoff (configurable max retries)
    - Safety evaluation before returning any response
    - Audit logging (PII-free) to `ai_audit_logs` table
    - Custom exceptions: `SafetyException`, `ParseException`
- **Adapter Pattern**: `backend/app/services/ai_client.py` (refactored)
    - `AIClientProtocol` abstract base class for provider flexibility
    - `TextBlobClient` implementing the protocol (legacy support)
    - `get_ai_client()` factory function with Gemini/TextBlob selection
    - Graceful fallback to TextBlob when Gemini unavailable
- **API Endpoint**: `backend/app/api/v1/routes/cbt_logs.py`
    - `POST /api/v1/cbt-logs/analyze` endpoint for AI-powered analysis
    - `SafetyException` handling with HTTP 451 status
    - Timeout handling with HTTP 504 status (10s timeout)
    - General error handling with HTTP 503 status

### Added - Tests
- **Unit Tests**: `backend/tests/services/`
    - `test_safety_handler.py` - Safety tier evaluation tests (8 test cases)
    - `test_prompt_manager.py` - Prompt loading tests (8 test cases)
    - `test_gemini_client.py` - Gemini client tests (11 test cases)
- **Integration Tests**: `backend/tests/integration/`
    - `test_cbt_analyze_endpoint.py` - API endpoint tests (10 test cases)

### Technical Notes
- **Implementation Plan**: Created `.worktrees/gemini/IMPLEMENTATION_PLAN.md` for tracking progress
- **Test Coverage**: Comprehensive tests covering happy paths, error handling, and edge cases
- **Safety Handling**: All AI responses are screened via `SafetyHandler.evaluate()`
- **Graceful Degradation**: System falls back to TextBlob if Gemini is unavailable or disabled

---
**Status**: All Phase 2 Brain implementation is complete. Ready for integration testing and deployment.

## [2026-03-04] - Stream A: Gemini Integration (The Brain) - COMPLETED & VERIFIED

### Added
- **Verified Gemini Client**: `backend/app/services/gemini_client.py`
    - Implemented strict **Cognitive Distortion Filtering** to ensure AI responses align with the 13 predefined categories.
    - Full async implementation using `asyncio.to_thread` for non-blocking I/O.
    - Advanced error handling for safety exceptions, timeouts, and parsing errors.
- **Resilient Prompt Manager**: `backend/app/services/prompt_manager.py`
    - Added placeholder validation (`{situation}`, `{automatic_thought}`) to prevent runtime crashes from malformed DB templates.
    - Robust fallback to local hardcoded templates on DB error or validation failure.
- **Factory Logic**: `backend/app/services/ai_client.py`
    - Refined adapter pattern with `GeminiAdapter`.
    - Factory correctly handles `ENABLE_GEMINI` toggle and missing libraries.

### Added - Tests (Behavioral Focus)
- **New Testing Strategy**: `docs/tests/Phase_2_Brain_Testing_Strategy.md`.
- **Factory Tests**: `backend/tests/services/test_ai_client_factory.py` (verifies config toggling).
- **Enhanced Service Tests**:
    - `test_detect_distortions_filters_unknown_distortions`: Verifies clinical constraint enforcement.
    - `test_get_distortion_prompt_malformed_template_fallback`: Verifies template resilience.
    - `test_analyze_cbt_logs_accurate_metadata`: Verifies operational auditability (latency, IDs).
- **Integration Suite**: Fully passing suite in `backend/tests/integration/test_cbt_analyze_endpoint.py`.

### Technical Notes
- **Verification**: All 35 tests passed across unit and integration suites.
- **Dependencies**: Confirmed `google-generativeai` and `pydantic-settings` are correctly configured in `pyproject.toml`.

---
**Status**: Stream A (The Brain) is fully implemented, behaviorally verified, and ready for Stream B integration.

## [2026-03-06] - Stream B: The Shield (Privacy & Audit) - COMPLETED

### Added
- **Privacy Service**: `backend/app/services/privacy.py`
    - Full implementation of regex-based masking for Emails and Phone Numbers.
    - Dictionary-based masking for proper names using `COMMON_NAMES` set.
    - In-memory `MaskingResult` for transient PII mapping and restoration.
- **Audit Logging**: 
    - **Repository**: `backend/app/repositories/audit.py` for persistent `ai_audit_logs` storage.
    - **Service**: `backend/app/services/audit.py` for managing log lifecycle (ID generation, timestamping).
- **Schemas**: `backend/app/schemas/audit.py`
    - `AIAuditLogBase`, `AIAuditLogCreate`, and `AIAuditLogPublic` Pydantic models.

### Changed
- **AI Client Orchestration**: `backend/app/services/ai_client.py`
    - Refactored `analyze_mood_note` to use `AIShieldOrchestrator`.
    - Integrated Privacy-Audit pipeline: Mask ➔ Log ➔ Analyze ➔ Unmask.
    - Added support for `correlation_id` context propagation.
- **Mood Repository**: `backend/app/repositories/mood.py`
    - Updated `create_mood_entry` to pass the `db` connection to `analyze_mood_note` for audit logging.

### Technical Notes
- **Data Privacy**: Successfully implemented PII-free audit logging (ADR-003). All sensitive data is masked before being sent to external providers or saved to logs.
- **Traceability**: Unified logging via `X-Correlation-ID` across middleware, services, and audit repositories.
- **Context Retention**: Masking explicitly avoids street names and general locations to preserve AI contextual accuracy.

---
**Status**: Stream B (The Shield) implementation is complete within the `pii` worktree. Ready for integration with Stream A (Gemini Integration).

## [2026-03-13] - Stream A: Gemini Integration (The Brain) - PR Fixes & Test Quality

### Added
- **Integration Test Suite**: `backend/tests/integration/test_cbt_analyze_endpoint.py`
    - 10 integration tests covering the `/api/v1/cbt-logs/analyze` endpoint.
    - Covers: POST acceptance, JSON validation, required field validation, response structure, `SafetyException` (HTTP 451), timeout (HTTP 504), general error (HTTP 503), field shape, and empty response handling.

### Changed
- **CI Workflow**: `.github/workflows/ci.yml`
    - Updated Python version from `3.11` to `3.12` in both `backend-checks` and `e2e-tests` jobs to match the `requires-python = ">=3.12"` constraint in `pyproject.toml`.
    - Added `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_TEMPERATURE` environment variables to the `Start Backend Service` step in `e2e-tests`, sourced from GitHub Actions secrets/env.
- **Backend Dependencies**: `backend/requirements.txt`
    - Regenerated via `uv pip compile pyproject.toml` to include all transitive dependencies, including the previously missing `google-generativeai` and `pydantic-settings`.
- **Gitignore**: `.gitignore`
    - Added `*/settings.json` pattern to avoid accidentally committing editor settings files.

### Fixed
- **Linting**: Resolved 11 `ruff` linting violations across the codebase:
    - 10 auto-fixed via `ruff check . --fix` (unused imports, formatting).
    - 1 manually fixed: unused variable assignment `manager` in `tests/services/test_prompt_manager.py`.
- **Async Test Execution**: Replaced synchronous `fastapi.testclient.TestClient` with `httpx.AsyncClient` (via `ASGITransport`) throughout `test_cbt_analyze_endpoint.py` to correctly handle the async FastAPI app under `anyio`.

### Refactored
- **Async Test Framework** — migrated from `pytest-asyncio` to `anyio` across all async test files:
    - `backend/tests/integration/test_cbt_analyze_endpoint.py`: Added `anyio_backend` fixture, replaced `@pytest.mark.asyncio` with `@pytest.mark.anyio`, replaced `TestClient` with `AsyncClient`.
    - `backend/tests/services/test_gemini_client.py`: Added `anyio_backend` fixture, replaced `@pytest.mark.asyncio` with `@pytest.mark.anyio`.
    - `backend/tests/services/test_prompt_manager.py`: Added `anyio_backend` fixture, replaced `@pytest.mark.asyncio` with `@pytest.mark.anyio`.

### Technical Notes
- **Test Count**: All 37 tests pass (27 unit + 10 integration).
- **anyio Consistency**: Using a single async backend (`anyio`) across all test files ensures consistent behaviour between local runs and CI environments.
- **Python 3.12 Alignment**: CI now correctly reflects the project's minimum Python requirement, eliminating environment-related false negatives.

---
**Status**: All fixes applied. PR ready for merge.

## [2026-03-14] - Phase 2: Full Integration & Alignment

### Added
- **API Specification v2**: `docs/api_spec_cbt_v2.md`
    - Documented actual implementation of `POST /api/v1/cbt-logs/analyze`.
    - Captured camelCase schema alignment and error handling (HTTP 451, 504, 503).
- **CI Secret Injection**: `.github/workflows/ci.yml`
    - Injected `GEMINI_API_KEY` and `GEMINI_MODEL` into the backend unit test suite to ensure tests requiring AI configuration pass in CI.

### Changed
- **Distortion Normalization**: `backend/app/core/constants.py`
    - Normalized `COGNITIVE_DISTORTIONS` to **Title Case** to match frontend TypeScript types.
    - Enhanced granularity by splitting "Jumping to Conclusions" into "Mind Reading" and "Fortune Telling".
- **Implementation Spec**: `docs/ai_implementation/ai_implementation_spec.md`
    - Promoted Phase 2 status to **COMPLETED**.
    - Updated technical details to reflect Python 3.12+, Pydantic Settings, and PII-free audit logging.

### Fixed
- **UI Distortion Identification**: `frontend/src/components/CBTLogForm.tsx`
    - Implemented case-insensitive matching (`toLowerCase()`) for AI suggestions to ensure amber highlights and Brain icons appear regardless of casing mismatches.
- **Frontend Linting**: Resolved 7 ESLint issues:
    - Escaped unescaped quote characters in JSX (e.g., `&ldquo;` / `&rdquo;`).
    - Removed unused imports (`DistortionSuggestion`, `RationalReframe`).
    - Cleaned up or aliased unused variables (`suggestion`, `isAllTime`).
- **Database Orchestration**: `docker-compose.yml`
    - Added explicit `sqitch init` and `sqitch plan` commands to the `db-migrate` service to ensure a reliable migration baseline.

### Technical Notes
- **End-to-End Alignment**: Cross-stream assessment confirmed backend/frontend alignment on distortion categories.
- **Test Integrity**: Updated `backend/tests/services/test_gemini_client.py` to match Title Case constants; all 37 tests remain green.
- **Consolidation**: Deprecated `.worktrees/gemini/docs/phase_2_brain_implementation_worktree_plan.md` in favor of the primary implementation document.

---
**Status**: Phase 2 "Brain" is fully integrated, aligned, and verified.


# LLM Provider Fallbacks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable ordered fallback across Gemini, OpenAI, and Ollama for CBT inference while keeping FastAPI routes provider-agnostic.

**Architecture:** Introduce provider configs, a provider registry, a fallback orchestrator, and provider adapters that return one internal `LLMResult` shape. Route code calls the orchestrator and receives validated CBT analysis results with provider metadata.

**Tech Stack:** FastAPI, Pydantic Settings, httpx, google-generativeai, pytest.

---

## Worktree

- Path: `.worktrees/llm-provider-fallbacks`
- Branch: `codex/llm-provider-fallbacks`
- Depends on: audit contracts from `codex/audit-observability`.

## File Ownership

- Modify: `backend/app/core/ai_config.py`
- Modify: `backend/app/services/ai_client.py`
- Modify: `backend/app/services/gemini_client.py`
- Create: `backend/app/services/llm_provider.py`
- Create: `backend/app/services/openai_client.py`
- Create: `backend/app/services/ollama_client.py`
- Create: `backend/app/services/llm_orchestrator.py`
- Create: `backend/tests/services/test_llm_provider_config.py`
- Create: `backend/tests/services/test_llm_orchestrator.py`
- Create: `backend/tests/services/test_openai_client.py`
- Create: `backend/tests/services/test_ollama_client.py`
- Modify: `backend/tests/services/test_ai_client_factory.py`
- Modify: `backend/tests/integration/test_cbt_analyze_endpoint.py`

## Requirements

- Configure primary and fallback models through environment variables.
- Support `gemini`, `openai`, and `ollama` provider ids.
- OpenAI integration should use the current Responses API and structured outputs where available.
- Ollama integration should use local HTTP endpoints and must not require external network access.
- Provider wrappers must expose provider/model metadata and normalized failure types.
- Unit tests must mock all HTTP/SDK calls.
- Safety blocks must not fall through to another provider unless a future safety policy explicitly permits it.

## Tasks

### Task 1: Parse Provider Chain

- [x] Write failing tests in `backend/tests/services/test_llm_provider_config.py`.

```python
from app.core.ai_config import parse_model_chain


def test_parse_model_chain_returns_ordered_provider_models():
    chain = parse_model_chain("gemini:gemini-1.5-flash,openai:gpt-5.5,ollama:llama3.1")
    assert [item.provider for item in chain] == ["gemini", "openai", "ollama"]
    assert chain[1].model == "gpt-5.5"


def test_parse_model_chain_rejects_unknown_provider():
    try:
        parse_model_chain("unknown:model")
    except ValueError as exc:
        assert "unknown provider" in str(exc).lower()
    else:
        raise AssertionError("Expected ValueError")
```

- [x] Run `cd backend; pytest tests/services/test_llm_provider_config.py -v`.
- [x] Implement `ProviderModel` and `parse_model_chain()` in `backend/app/core/ai_config.py`.
- [x] Add settings for `ai_cbt_model_chain`, `openai_api_key`, `ollama_base_url`, and provider timeouts.

### Task 2: Define Provider Protocol

- [x] Create `backend/app/services/llm_provider.py` with `LLMProvider`, `LLMResult`, and typed exceptions: `LLMProviderError`, `LLMTimeoutError`, `LLMParseError`, `LLMSafetyBlocked`.
- [x] Update tests to import and assert these types.
- [x] Ensure provider result includes `provider`, `model`, `raw_payload`, `parsed_payload`, `latency_ms`, and optional `safety_ratings`.

### Task 3: Add Fallback Orchestrator

- [x] Write failing orchestrator test with fake providers: first provider raises `LLMProviderError`, second provider succeeds.
- [x] Assert the orchestrator returns the second provider result and records both attempts through the audit service.
- [x] Implement `backend/app/services/llm_orchestrator.py`.
- [x] Add a test that `LLMSafetyBlocked` stops fallback and is re-raised.

### Task 4: Wrap Existing Gemini Client

- [x] Write failing test proving Gemini adapter returns `LLMResult(provider="gemini", model=configured_model)`.
- [x] Refactor Gemini-specific request execution behind the provider protocol.
- [x] Keep existing safety handling and parse validation behavior.
- [x] Run existing Gemini tests to catch regressions.

### Task 5: Add OpenAI Provider

- [x] Write failing tests in `backend/tests/services/test_openai_client.py` using a mocked `httpx.AsyncClient`.
- [x] Test that request JSON includes configured model, structured output format, and no raw provider key in logs.
- [x] Implement `OpenAIClient` with injected HTTP client for testability.
- [x] Normalize structured output parse failures to `LLMParseError`.

### Task 6: Add Ollama Provider

- [x] Write failing tests in `backend/tests/services/test_ollama_client.py` using a mocked local HTTP response.
- [x] Implement `OllamaClient` against `${OLLAMA_BASE_URL}/api/generate` or configured endpoint.
- [x] Normalize Ollama JSON response text into the same internal parsed payload shape.
- [x] Do not require Ollama to be running in CI tests.

### Task 7: Replace Factory Usage In CBT Endpoint

- [x] Update `get_ai_client()` or introduce `get_llm_orchestrator()` so route code does not branch by provider.
- [x] Update `backend/tests/integration/test_cbt_analyze_endpoint.py` to assert provider/model metadata appears in response.
- [x] Preserve `TextBlobClient` for mood analysis fallback only.

## Validation Status

- [x] PR opened: https://github.com/hweecat/mood-tracker/pull/5.
- [x] GitHub Actions CI passed for current head `26c21882e64ddd6c5474fe30fd3302d25a2306d8` (run `25492058106`).
- [x] 2026-05-10 re-verification: focused provider suite `tests/services/test_llm_provider_config.py tests/services/test_llm_orchestrator.py tests/services/test_openai_client.py tests/services/test_ollama_client.py tests/services/test_ai_client_factory.py tests/services/test_gemini_client.py tests/integration/test_cbt_analyze_endpoint.py` passed with `43 passed, 33 warnings`.
- [x] PR is ready for review and mergeable as of 2026-05-10.
- [x] PR review follow-up: map provider `LLMTimeoutError` to HTTP 504 instead of generic 503.
- [x] PR review follow-up: add safe `error_type`/`error_class` logging metadata without raw exception text.
- [x] Verification follow-up: add direct log-capture coverage proving OpenAI provider keys are not emitted to logs.
- [x] Verification follow-up: add an invalid provider-timeout configuration test if timeout positivity remains part of the config contract.
- [x] PR review follow-up: merge provider-client caching from PR #10 after its cache-key review is resolved.
- [x] PR #10 review follow-up: cache invalidation must distinguish rotated non-empty OpenAI keys without logging the key.
- [x] 2026-05-11 follow-up verification: focused tests for Gemini `LLMResult` metadata, OpenAI secret-safe failure logs, non-positive `AI_PROVIDER_TIMEOUT` validation, and OpenAI provider-cache invalidation passed with `4 passed, 1 warning`.
- [x] 2026-05-11 broader provider verification: `tests/services/test_llm_provider_config.py tests/services/test_llm_orchestrator.py tests/services/test_openai_client.py tests/services/test_ollama_client.py tests/services/test_ai_client_factory.py tests/services/test_gemini_client.py tests/integration/test_cbt_analyze_endpoint.py` passed with `47 passed, 40 warnings`.
- [x] 2026-05-19 review follow-up: malformed OpenAI structured-output items without `text` now normalize to `LLMParseError` instead of `LLMProviderError`; focused provider suite passed with `48 passed, 41 warnings`.

## Acceptance Criteria

- Provider chain parsing is covered by tests.
- Orchestrator fallback and safety-stop behavior are covered by tests.
- Gemini/OpenAI/Ollama providers are unit-tested without real network calls.
- `/api/v1/cbt-logs/analyze` remains stable and includes provider metadata.
- No provider-specific API key or raw prompt is logged.
- Provider timeouts return timeout-specific API behavior and remain distinguishable from generic provider errors.
- Provider-client reuse avoids per-request HTTP client pool churn, with safe cache invalidation on provider chain, endpoint, timeout, and credential changes.

# CBT Quality And Action Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI reframes more human and empathetic, then add structured AI-generated action plan suggestions after reframing.

**Architecture:** Extend CBT schemas and prompt templates to request empathic reframes plus action plans in one validated response contract. Keep the UI HITL: AI content is selectable/editable, and the user's final text remains the source of truth.

**Tech Stack:** FastAPI, Pydantic, prompt_versions SQLite table, pytest, Next.js/TypeScript for contract alignment.

---

## Worktree

- Path: `.worktrees/cbt-quality-action-plans`
- Branch: `codex/cbt-quality-action-plans`
- Depends on: provider metadata from `codex/llm-provider-fallbacks`; audit ids from `codex/audit-observability`.

## File Ownership

- Modify: `backend/app/schemas/cbt.py`
- Modify: `backend/app/services/prompt_manager.py`
- Modify: `backend/app/services/gemini_client.py` or provider-independent CBT parser after provider fallback lands
- Modify: `migrations/deploy/add_prompt_versions.sql` only if seeding is still safe; otherwise add a new prompt seed migration
- Create: `backend/tests/services/test_cbt_quality_prompts.py`
- Create: `backend/tests/services/test_cbt_action_plan_parser.py`
- Modify: `backend/tests/integration/test_cbt_analyze_endpoint.py`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/hooks/useCBTAnalysis.ts`

## Requirements

- Reframe prompt must require validation, warmth, user agency, and non-diagnostic language.
- Action plans must be concrete, small, self-help oriented, and framed as optional.
- Crisis or self-harm content must remain governed by the safety path, not ordinary action plans.
- Response schema must include stable ids for suggestions, reframes, and action plans.
- Existing clients should not break if they ignore `actionPlans`.

## Status

- Backend implementation verified with `GEMINI_API_KEY=test-key uv run --with pytest pytest -p no:cacheprovider`: 91 passed, 81 warnings.
- Focused action-plan parser verification: `uv run --with pytest pytest -p no:cacheprovider tests/services/test_cbt_action_plan_parser.py -q`: 9 passed.
- Focused review-regression verification: `uv run --with pytest pytest -p no:cacheprovider tests/services/test_cbt_action_plan_parser.py tests/services/test_cbt_quality_prompts.py tests/integration/test_cbt_analyze_endpoint.py tests/services/test_llm_orchestrator.py tests/services/test_gemini_client.py tests/services/test_ai_audit_service.py -q`: 42 passed, 27 warnings.
- Focused provider safety verification: `uv run --with pytest pytest -p no:cacheprovider tests/services/test_openai_client.py tests/services/test_ollama_client.py -q`: 8 passed.
- Focused provider PII masking verification: `uv run --with pytest pytest -p no:cacheprovider tests/services/test_openai_client.py::test_openai_prompt_masks_direct_identifiers_before_provider_call tests/services/test_ollama_client.py::test_ollama_prompt_masks_direct_identifiers_before_provider_call tests/services/test_gemini_client.py::TestGeminiClient::test_generate_reframes_and_action_plans_masks_direct_identifiers -q`: 3 passed.
- Backend lint verified with `uv run --with ruff ruff check .`: all checks passed.
- Frontend type/test changes are present, but local frontend verification is blocked because `npm`, `npx`, `pnpm`, `yarn`, and `corepack` are unavailable and `frontend/node_modules` is absent in this worktree.

## Tasks

### Task 1: Add Action Plan Schema

- [x] Write failing schema test in `backend/tests/services/test_cbt_action_plan_parser.py`.

```python
from app.schemas.cbt import CBTActionPlan, CBTAnalysisResponse


def test_cbt_analysis_response_accepts_action_plans():
    response = CBTAnalysisResponse(
        analysis_id="analysis-1",
        suggestions=[],
        reframes=[],
        action_plans=[
            CBTActionPlan(
                id="plan-1",
                title="Send one message",
                rationale="A small outreach step can reduce avoidance.",
                steps=["Text one trusted friend and ask for a short check-in."],
                timeframe="today",
            )
        ],
        provider="gemini",
        model="gemini-1.5-flash",
        prompt_version="cbt-v2",
    )
    assert response.action_plans[0].title == "Send one message"
```

- [x] Run `cd backend; pytest tests/services/test_cbt_action_plan_parser.py -v`.
- [x] Implement `CBTActionPlan` and extend `CBTAnalysisResponse`.
- [x] Confirm camelCase serialization still maps `actionPlans`.

### Task 2: Empathy Prompt Regression

- [x] Write failing prompt test in `backend/tests/services/test_cbt_quality_prompts.py` that loads the reframing prompt and asserts it contains:
  - `validate the user's feeling`
  - `avoid diagnosis`
  - `do not minimize`
  - `optional`
  - `one small next step`
  - `crisis or self-harm`
  - `safety path`
- [x] Run the test and verify failure.
- [x] Add prompt version text for empathetic reframing and action planning.
- [x] Keep wording concise to control latency and cost.

### Task 3: Parse Action Plans From Provider Output

- [x] Write failing parser test with provider JSON containing `action_plans`.
- [x] Implement parser normalization so both snake_case `action_plans` and camelCase `actionPlans` are accepted internally.
- [x] Reject malformed plans with `LLMParseError` or current parse exception.
- [x] Ensure no more than 3 action plans are returned, while preserving backward compatibility for omitted `actionPlans`.

### Task 4: Endpoint Contract Test

- [x] Update integration test to mock CBT analysis result with `actionPlans`.
- [x] Assert `/api/v1/cbt-logs/analyze` returns `analysisId`, `provider`, `model`, `suggestions`, `reframes`, and `actionPlans`.
- [x] Preserve existing status handling for safety, timeout, and provider errors.

### Task 5: Frontend Type Contract

- [x] Update `frontend/src/types/index.ts` with `CBTActionPlan` and extended `CBTAnalysisResponse`.
- [x] Update `useCBTAnalysis` tests to assert `actionPlans` is preserved from response.
- [x] Do not redesign the full UI in this workstream; leave mobile layout to `codex/mobile-usability`.

## Acceptance Criteria

- Backend schema and integration tests cover action plans.
- Prompt tests enforce empathy and safety language.
- Parser handles valid action plan output and rejects malformed output.
- Frontend types can consume the new field without breaking existing tests.
- No AI output claims diagnosis, certainty, or professional treatment.


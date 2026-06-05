# AI CBT Enhancements Roadmap

Date: 2026-05-03

## Purpose

This roadmap coordinates the next phase of MindfulTrack: more empathetic AI-assisted CBT journaling, configurable LLM provider fallback, reliable audit/eval data collection, offline batch evals, asynchronous journal and mood analysis, and mobile usability improvements.

The app handles sensitive mental health data. The implementation target is privacy-by-design and healthcare-grade operational discipline. This document does not claim HIPAA or GDPR compliance by itself; it defines engineering controls that support later legal, policy, and security review.

## Current Findings

- The current `ai_audit_logs` schema and Gemini audit insert code disagree, so audit records are not reliably stored.
- `backend/app/repositories/mood.py` performs mood note analysis inline before insert, which slows writes and couples persistence to analysis availability.
- The current AI abstraction already has a small `AIClientProtocol`, but provider selection is Gemini/TextBlob specific and does not support ordered fallback.
- The CBT analysis endpoint returns distortions and reframes, but not AI-generated action plans.
- The frontend captures AI-suggested distortions only partially; accepted/edited user responses are not persisted as structured feedback events for evals.
- The mobile CBT flow uses large containers, heavy spacing, horizontal suggestion cards, and hover-first affordances that should be redesigned for small screens.
- `.worktrees/` exists but is not ignored by the current `.gitignore`; before creating new project-local worktrees, add `.worktrees/` to `.gitignore` and commit that hygiene change.

## Workstream Order

| Order | Worktree | Branch | Subagent role | Scope | Depends on |
| --- | --- | --- | --- | --- | --- |
| 0 | root | `codex/worktree-hygiene` | Orchestrator | Ignore `.worktrees/`, create worktrees, run baseline tests | None |
| 1 | `.worktrees/audit-observability` | `codex/audit-observability` | Audit and observability worker | Fix audit schema, add HITL feedback capture, privacy-safe audit repository | Worktree hygiene |
| 2 | `.worktrees/llm-provider-fallbacks` | `codex/llm-provider-fallbacks` | Provider abstraction worker | Gemini/OpenAI/Ollama registry, ordered fallback, provider metadata | Audit contracts |
| 3 | `.worktrees/cbt-quality-action-plans` | `codex/cbt-quality-action-plans` | CBT quality worker | Empathetic reframing prompts and AI action plan response contract | Provider metadata, audit ids |
| 4 | `.worktrees/async-analysis` | `codex/async-analysis` | Async processing worker | Post-insert analysis jobs for mood and CBT data | Audit contracts |
| 5 | `.worktrees/batch-evals` | `codex/batch-evals` | Evals worker | Offline eval pipeline over audit data and public CBT datasets | Audit data shape, provider runner |
| 6 | `.worktrees/mobile-usability` | `codex/mobile-usability` | Mobile UX worker | Mobile-first CBT flow and suggestion acceptance UX | CBT response contract |

Merge in the same order. If a later stream finishes early, keep it rebased onto the latest merged contract before review.

## Worktree Setup

Use `.worktrees/` after it is ignored.

```powershell
git checkout -b codex/worktree-hygiene
```

Patch `.gitignore` with:

```gitignore
.worktrees/
```

Then create each worktree from `main` after hygiene is merged:

```powershell
git worktree add .worktrees/audit-observability -b codex/audit-observability
git worktree add .worktrees/llm-provider-fallbacks -b codex/llm-provider-fallbacks
git worktree add .worktrees/cbt-quality-action-plans -b codex/cbt-quality-action-plans
git worktree add .worktrees/async-analysis -b codex/async-analysis
git worktree add .worktrees/batch-evals -b codex/batch-evals
git worktree add .worktrees/mobile-usability -b codex/mobile-usability
```

Each worker must run baseline tests in its worktree before starting feature work.

```powershell
cd backend; pytest
cd ..\frontend; npm test
```

Use the subset that applies to the workstream, then run the broader suite before merge.

## Baseline Status

Captured on 2026-05-03 from orchestration commit `3f649b0`.

| Surface | Command | Status | Notes |
| --- | --- | --- | --- |
| Backend | `UV_CACHE_DIR=.uv-cache GEMINI_API_KEY=test-key uv run --with pytest pytest` from `.worktrees/audit-observability/backend` | Pass | 42 passed, 56 warnings. Without a dummy `GEMINI_API_KEY`, 8 existing Gemini tests fail because `AIConfig.gemini_api_key` is required during `PromptManager` initialization. |
| Backend sibling worktrees | Same command in parallel | Inconclusive | Parallel `uv` environment creation in OneDrive timed out. Workers should run the same command serially in their own worktree before feature edits. |
| Frontend | `npm test` from `.worktrees/mobile-usability/frontend` | Blocked | `node` and `npm` are not available on PATH in the current shell. Mobile worker must establish a Node runtime before running Vitest/Playwright. |
| Batch evals | No baseline command yet | Not applicable | `evals/` package does not exist before the batch-evals stream starts. |

## Workstream Review Status

| Worktree | Branch | Status | Latest verification |
| --- | --- | --- | --- |
| `.worktrees/llm-provider-fallbacks` | `codex/llm-provider-fallbacks` | PR #5 ready, mergeable, current head `26c2188`, CI green | 2026-05-10 re-verification passed focused provider suite with `43 passed, 33 warnings`; direct Gemini adapter result-shape test and provider-client caching remain open. |
| `.worktrees/async-analysis` | `codex/async-analysis` | Backend async job lifecycle implemented and verified; review follow-ups still open | 2026-05-10 re-verification passed focused async suites with `18 passed, 22 warnings` and `18 passed, 21 warnings`; mood `aiAnalysis` compatibility, CBT feedback atomicity, duplicate-scheduling idempotency, and frontend `/analyses/` display remain open. |

## Orchestrator Responsibilities

- Keep this roadmap current as streams merge or requirements change.
- Assign one subagent per workstream with a disjoint write scope.
- Require TDD in every implementation task: failing test first, verify red, implement, verify green, refactor.
- Review each worker in two passes before merge: spec compliance first, then code quality and privacy review.
- Resolve schema/API conflicts centrally instead of allowing workers to invent divergent contracts.
- Ask the user before changing safety posture, retention policy, provider list, dataset licensing assumptions, or clinical language constraints.

## Shared Engineering Rules

- Do not log raw journal text, automatic thoughts, rational responses, names, emails, phone numbers, addresses, or provider prompts in application logs.
- Store sensitive application data only in the application database, never in process logs or CI artifacts.
- Keep audit data structured and PII-minimized, with explicit fields for provider, model, prompt version, request id, latency, status, safety tier, and schema version.
- External provider calls must receive masked/minimized payloads unless the user has explicitly opted into a local-only or external-provider mode.
- Provider wrappers must be tested with mocks and must not require real API keys in unit tests.
- Public dataset ingestion must record dataset name, split/file, license, source URL, transformation version, and whether examples are synthetic or human-authored.
- AI outputs must be non-diagnostic, non-prescriptive, and framed as suggestions. Crisis-related handling must point users to appropriate crisis resources instead of continuing ordinary journaling advice.

## Acceptance Criteria

The development phase is complete when all of these are true:

- Audit writes succeed against SQLite migrations and code-driven local DB initialization.
- Model-generated suggestions, user-accepted suggestions, ignored suggestions, user-edited rational responses, and action plans are persisted with enough metadata for offline evals.
- CBT inference supports configurable ordered fallback across Gemini, OpenAI, and Ollama without route-level provider conditionals.
- Provider metadata is included in API responses and audit rows.
- Reframes are measurably warmer and more empathetic through prompt tests, fixture review, and UI copy review.
- CBT analysis can include actionable self-help plans after reframing, and the UI lets users accept or edit them.
- Mood and CBT data analysis runs asynchronously after successful inserts and persists retrievable status/results.
- Batch evals run outside the webapp and can evaluate internal audit examples plus CBT-Bench and Cactus-format fixtures.
- Mobile journaling is usable at 320px, 375px, 390px, 768px, and desktop widths without text clipping, hover-only controls, or horizontal body overflow.
- Backend tests, frontend tests, relevant Playwright checks, and eval pipeline tests pass in their final merge worktree.
- Privacy review confirms no raw sensitive user text appears in app logs, failed test output, provider error logs, or audit metadata fields not designed for sensitive application data.

## Source References

- CBT-Bench dataset: https://huggingface.co/datasets/Psychotherapy-LLM/CBT-Bench
- Cactus dataset: https://huggingface.co/datasets/LangAGI-Lab/cactus
- CBT-Bench paper summary: https://huggingface.co/papers/2410.13218
- Cactus paper summary: https://huggingface.co/papers/2407.03103
- OpenAI models documentation: https://developers.openai.com/api/docs/models
- OpenAI Structured Outputs documentation: https://platform.openai.com/docs/guides/structured-outputs

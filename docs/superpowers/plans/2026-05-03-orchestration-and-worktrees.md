# Orchestration And Worktrees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare safe worktree isolation, dispatch subagents with clear ownership, and maintain integration quality across all AI CBT enhancement streams.

**Architecture:** The main agent owns branch hygiene, roadmap updates, subagent prompts, review gates, merge order, and final integration checks. Subagents own disjoint implementation scopes in dedicated worktrees.

**Tech Stack:** Git worktrees, PowerShell, pytest, npm/Vitest, Playwright, repository docs.

---

## Worktree

- Path: root workspace first, then `.worktrees/*`
- Branch: `codex/worktree-hygiene`
- Owner: main orchestrator, not a feature subagent

## Requirements

- `.worktrees/` must be ignored before new project-local worktrees are created.
- Each worktree must start from a clean baseline and record baseline test status.
- Each subagent prompt must include exact plan path, write scope, dependencies, and TDD instructions.
- No two subagents may write the same files at the same time unless the orchestrator explicitly serializes the work.
- The orchestrator must review each stream for spec compliance, code quality, tests, and privacy posture before merge.

## Tasks

### Task 1: Make Project-Local Worktrees Safe

- [x] Write the intended `.gitignore` change first.

```gitignore
.worktrees/
```

- [x] Run `git check-ignore -v .worktrees`.
- [x] Expected after the patch: output identifies `.gitignore` as the source rule.
- [x] Commit planning/worktree hygiene on orchestration branch.

### Task 2: Create Worktrees

- [x] Create worktrees after Task 1 lands.

```powershell
git worktree add .worktrees/audit-observability -b codex/audit-observability
git worktree add .worktrees/llm-provider-fallbacks -b codex/llm-provider-fallbacks
git worktree add .worktrees/cbt-quality-action-plans -b codex/cbt-quality-action-plans
git worktree add .worktrees/async-analysis -b codex/async-analysis
git worktree add .worktrees/batch-evals -b codex/batch-evals
git worktree add .worktrees/mobile-usability -b codex/mobile-usability
```

- [x] Run `git worktree list`.
- [x] Confirm every worktree path and branch is present.

### Task 3: Capture Baseline Test Status

- [x] In backend-owned worktrees, run:

```powershell
cd backend
pytest
```

- [x] In frontend-owned worktrees, run:

```powershell
cd frontend
npm test
```

- [ ] For mobile work, also run:

```powershell
cd frontend
npx playwright test e2e/visual/vrt_cbt_flow.spec.ts
```

- [x] If baseline tests fail, record the exact command, exit code, and failure summary in `docs/roadmap/ai-cbt-enhancements-roadmap.md` before assigning feature work.

### Task 4: Dispatch Subagents

- [x] Send each subagent only its plan file and relevant context.
- [x] Require the worker to report one of: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
- [x] Include this instruction in every worker prompt:

```text
You are not alone in the codebase. Work only inside your assigned worktree and write scope. Do not revert edits made by others. Follow TDD: write the failing test, verify it fails for the intended reason, implement the smallest change, verify it passes, then refactor.
```

### Task 5: Review Each Stream

- [x] Spec compliance review: compare the diff to the workstream plan and master design spec for audit, provider fallback, CBT quality/action plans, async analysis, and batch streams.
- [x] Code quality review: inspect maintainability, test design, privacy risks, schema drift, and error handling for audit, provider fallback, CBT quality/action plans, async analysis, and batch streams.
- [x] Verification review: confirm fresh local verification where available and GitHub Actions CI for audit, provider fallback, CBT quality/action plans, async analysis, and batch streams.
- [x] Privacy review: search for raw sensitive strings in logs/tests and inspect logger extras for audit, provider fallback, CBT quality/action plans, async analysis, and batch streams.
- [x] Only merge after all review findings are resolved for non-mobile streams.

### Task 6: Integrate In Order

- [ ] Merge `codex/audit-observability`.
- [ ] Rebase or update `codex/llm-provider-fallbacks`, then merge it.
- [ ] Rebase or update `codex/cbt-quality-action-plans`, then merge it.
- [ ] Rebase or update `codex/async-analysis`, then merge it.
- [ ] Rebase or update `codex/batch-evals`, then merge it.
- [ ] Rebase or update `codex/mobile-usability`, then merge it.
- [ ] Run final backend, frontend, eval, and Playwright checks from the integrated branch.

## Integration Readiness Status

- [x] `codex/audit-observability`: PR #7 ready, mergeable, current head `53399ba`, CI run `25492073370` green; authenticated audit-row `user_id` linkage remains an integration follow-up.
- [x] `codex/llm-provider-fallbacks`: PR #5 ready, mergeable, current head `26c2188`, CI run `25492058106` green; direct Gemini adapter result-shape test and provider-client caching remain open.
- [ ] `codex/cbt-quality-action-plans`: PR #6 mergeable and CI green at head `1dfe1c8`, but GitHub still reports it as draft; mark ready before merge and resolve docs/UI follow-ups through mobile integration.
- [x] `codex/async-analysis`: PR #8 ready, mergeable, current head `2ab39c1`, CI run `25492089771` green; mood compatibility and CBT feedback atomicity remain open.
- [x] `codex/batch-evals`: PR #9 ready, mergeable, current head `66e3b7b`, CI run `25492104837` green; repo-root-relative fixture detection and accepted-payload hardening remain open.
- [ ] `codex/mobile-usability`: partially implemented but plan tasks remain unchecked; browser/Vitest/Playwright verification is blocked in this sandbox and branch is not merge-ready.

## 2026-05-10 Re-Verification Notes

- Browser-use was attempted first, but the Node-backed browser runtime failed with `Access is denied` even for a trivial `nodeRepl.write()` probe. Plan review continued through local file inspection, GitHub connector checks, and subagent test evidence.
- `git check-ignore -v .worktrees/audit-observability` confirms the feature worktree paths are ignored. Bare `git check-ignore -v .worktrees` no longer reports because legacy tracked entries exist under `.worktrees/gemini`, `.worktrees/pii`, and `.worktrees/ui`.
- Keep follow-up tasks unchecked until they are implemented and freshly verified; do not rely on earlier green CI alone for roadmap acceptance criteria that mention frontend UX, atomicity, provider-client caching, or privacy hardening.

## Acceptance Criteria

- `.worktrees/` is ignored before new worktrees are created.
- Every workstream has an isolated branch and worktree.
- Baseline test status is recorded before feature implementation starts.
- Every subagent receives a disjoint write scope and TDD instructions.
- Every stream passes spec, quality, verification, and privacy review before merge.
- The roadmap stays current after each merge.

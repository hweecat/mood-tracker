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

- [ ] Write the intended `.gitignore` change first.

```gitignore
.worktrees/
```

- [ ] Run `git check-ignore -v .worktrees`.
- [ ] Expected after the patch: output identifies `.gitignore` as the source rule.
- [ ] Commit with `chore: ignore local worktrees`.

### Task 2: Create Worktrees

- [ ] Create worktrees after Task 1 lands.

```powershell
git worktree add .worktrees/audit-observability -b codex/audit-observability
git worktree add .worktrees/llm-provider-fallbacks -b codex/llm-provider-fallbacks
git worktree add .worktrees/cbt-quality-action-plans -b codex/cbt-quality-action-plans
git worktree add .worktrees/async-analysis -b codex/async-analysis
git worktree add .worktrees/batch-evals -b codex/batch-evals
git worktree add .worktrees/mobile-usability -b codex/mobile-usability
```

- [ ] Run `git worktree list`.
- [ ] Confirm every worktree path and branch is present.

### Task 3: Capture Baseline Test Status

- [ ] In backend-owned worktrees, run:

```powershell
cd backend
pytest
```

- [ ] In frontend-owned worktrees, run:

```powershell
cd frontend
npm test
```

- [ ] For mobile work, also run:

```powershell
cd frontend
npx playwright test e2e/visual/vrt_cbt_flow.spec.ts
```

- [ ] If baseline tests fail, record the exact command, exit code, and failure summary in `docs/roadmap/ai-cbt-enhancements-roadmap.md` before assigning feature work.

### Task 4: Dispatch Subagents

- [ ] Send each subagent only its plan file and relevant context.
- [ ] Require the worker to report one of: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`.
- [ ] Include this instruction in every worker prompt:

```text
You are not alone in the codebase. Work only inside your assigned worktree and write scope. Do not revert edits made by others. Follow TDD: write the failing test, verify it fails for the intended reason, implement the smallest change, verify it passes, then refactor.
```

### Task 5: Review Each Stream

- [ ] Spec compliance review: compare the diff to the workstream plan and master design spec.
- [ ] Code quality review: inspect maintainability, test design, privacy risks, schema drift, and error handling.
- [ ] Verification review: rerun the workstream's stated test commands fresh.
- [ ] Privacy review: search for raw sensitive strings in logs/tests and inspect logger extras.
- [ ] Only merge after all review findings are resolved.

### Task 6: Integrate In Order

- [ ] Merge `codex/audit-observability`.
- [ ] Rebase or update `codex/llm-provider-fallbacks`, then merge it.
- [ ] Rebase or update `codex/cbt-quality-action-plans`, then merge it.
- [ ] Rebase or update `codex/async-analysis`, then merge it.
- [ ] Rebase or update `codex/batch-evals`, then merge it.
- [ ] Rebase or update `codex/mobile-usability`, then merge it.
- [ ] Run final backend, frontend, eval, and Playwright checks from the integrated branch.

## Acceptance Criteria

- `.worktrees/` is ignored before new worktrees are created.
- Every workstream has an isolated branch and worktree.
- Baseline test status is recorded before feature implementation starts.
- Every subagent receives a disjoint write scope and TDD instructions.
- Every stream passes spec, quality, verification, and privacy review before merge.
- The roadmap stays current after each merge.


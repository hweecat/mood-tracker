# Batch Evals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline eval pipeline that compares model CBT outputs against user-accepted/user-input responses and public CBT research datasets.

**Architecture:** Create a separate `evals/` package with dataset adapters, normalization, runners, metrics, and report writers. The pipeline reads exported data and fixture files; it does not depend on a running FastAPI app.

**Tech Stack:** Python 3.12, stdlib json/csv, optional Hugging Face dataset files, pytest.

---

## Worktree

- Path: `.worktrees/batch-evals`
- Branch: `codex/batch-evals`
- Depends on: audit/feedback export shape from `codex/audit-observability`; provider runner shape from `codex/llm-provider-fallbacks`.

## File Ownership

- Create: `evals/__init__.py`
- Create: `evals/datasets.py`
- Create: `evals/normalization.py`
- Create: `evals/metrics.py`
- Create: `evals/runner.py`
- Create: `evals/reporting.py`
- Create: `evals/cli.py`
- Create: `evals/fixtures/cbt_bench_distortions_sample.json`
- Create: `evals/fixtures/cactus_sample.json`
- Create: `evals/fixtures/internal_feedback_sample.jsonl`
- Create: `evals/tests/test_dataset_adapters.py`
- Create: `evals/tests/test_metrics.py`
- Create: `evals/tests/test_runner.py`
- Create: `docs/evals/batch-evals.md`

## Requirements

- Keep evals separate from the webapp runtime.
- Normalize internal audit/feedback examples, CBT-Bench examples, and Cactus examples into one `EvalExample` shape.
- Store dataset provenance and license metadata.
- Support classification metrics for distortions and text-generation comparison metrics for reframes/action plans.
- CI tests must use local fixtures only.
- Provider calls must be mockable and disabled by default.

## Tasks

### Task 1: Normalize Public Dataset Fixtures

- [x] Write failing tests in `evals/tests/test_dataset_adapters.py`.

```python
from pathlib import Path

from evals.datasets import load_cbt_bench_distortion_examples, load_cactus_examples


def test_load_cbt_bench_distortion_fixture():
    examples = load_cbt_bench_distortion_examples(Path("evals/fixtures/cbt_bench_distortions_sample.json"))
    assert examples[0].dataset == "Psychotherapy-LLM/CBT-Bench"
    assert examples[0].task == "distortion_classification"
    assert "automatic_thought" in examples[0].input
    assert examples[0].reference["distortions"]


def test_load_cactus_fixture():
    examples = load_cactus_examples(Path("evals/fixtures/cactus_sample.json"))
    assert examples[0].dataset == "LangAGI-Lab/cactus"
    assert examples[0].task == "cbt_action_plan_generation"
    assert examples[0].reference["cbt_plan"]
```

- [x] Run `pytest evals/tests/test_dataset_adapters.py -v`.
- [x] Implement `EvalExample` and dataset loaders.
- [x] Include license/provenance fields in every example.

### Task 2: Normalize Internal Feedback Data

- [x] Write fixture `evals/fixtures/internal_feedback_sample.jsonl` representing `ai_feedback_events` plus linked audit metadata.
- [x] Write failing loader test that emits examples with `task="user_preference_alignment"`.
- [x] Implement internal feedback loader.
- [x] Ensure sensitive fixture data is synthetic.

### Task 3: Add Metrics

- [x] Write failing tests for:
  - exact/multi-label distortion precision/recall/F1,
  - accepted-vs-generated text similarity using token overlap,
  - action-plan checklist completeness.
- [x] Implement `evals/metrics.py`.
- [x] Keep metrics deterministic and explainable before adding LLM-as-judge.

### Task 4: Add Runner

- [x] Write failing runner test with a fake provider function returning deterministic outputs.
- [x] Implement `evals/runner.py` to run examples through a callable model adapter.
- [x] Save results as JSONL with provider/model/prompt metadata.
- [x] Do not import FastAPI app modules.

### Task 5: CLI And Report

- [x] Add CLI command:

```powershell
python -m evals.cli run --dataset evals/fixtures/internal_feedback_sample.jsonl --output evals/out/internal-feedback-report.json
```

- [x] Write CLI smoke test using `tmp_path`.
- [x] Implement report writer with aggregate metrics and per-example failures.
- [x] Document usage in `docs/evals/batch-evals.md`.

## Validation Status

- [x] PR opened: https://github.com/hweecat/mood-tracker/pull/9.
- [x] GitHub Actions CI passed for head `bc1ac0c3d974c804605407bee62e99b9f5f9aaf8` (run `25299979604`).
- [x] PR is ready for review and mergeable as of orchestration review on 2026-05-04.
- [x] PR review follow-up: internal feedback loader coerces `null` or non-object nested `feedback_event`, `audit_log`, and response payload values to empty mappings before dereferencing.
- [x] PR review follow-up: committed fixture detection uses repo-root-relative checks so external exports under similarly named paths are not misclassified as synthetic fixtures.

## Acceptance Criteria

- `pytest evals/tests -v` passes.
- Evals package runs without the webapp or backend server.
- Fixtures cover CBT-Bench, Cactus, and internal feedback formats.
- Report includes metrics, provenance, provider/model, and prompt version metadata.
- Dataset license notes are documented.
- Internal feedback exports with malformed nested records do not abort the full eval run.
- Synthetic fixture and human-authored provenance are derived from repo-root-relative fixture paths or explicit overrides, not substring-style path heuristics.

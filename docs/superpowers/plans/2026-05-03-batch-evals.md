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

- [ ] Write failing tests in `evals/tests/test_dataset_adapters.py`.

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

- [ ] Run `pytest evals/tests/test_dataset_adapters.py -v`.
- [ ] Implement `EvalExample` and dataset loaders.
- [ ] Include license/provenance fields in every example.

### Task 2: Normalize Internal Feedback Data

- [ ] Write fixture `evals/fixtures/internal_feedback_sample.jsonl` representing `ai_feedback_events` plus linked audit metadata.
- [ ] Write failing loader test that emits examples with `task="user_preference_alignment"`.
- [ ] Implement internal feedback loader.
- [ ] Ensure sensitive fixture data is synthetic.

### Task 3: Add Metrics

- [ ] Write failing tests for:
  - exact/multi-label distortion precision/recall/F1,
  - accepted-vs-generated text similarity using token overlap,
  - action-plan checklist completeness.
- [ ] Implement `evals/metrics.py`.
- [ ] Keep metrics deterministic and explainable before adding LLM-as-judge.

### Task 4: Add Runner

- [ ] Write failing runner test with a fake provider function returning deterministic outputs.
- [ ] Implement `evals/runner.py` to run examples through a callable model adapter.
- [ ] Save results as JSONL with provider/model/prompt metadata.
- [ ] Do not import FastAPI app modules.

### Task 5: CLI And Report

- [ ] Add CLI command:

```powershell
python -m evals.cli run --dataset evals/fixtures/internal_feedback_sample.jsonl --output evals/out/internal-feedback-report.json
```

- [ ] Write CLI smoke test using `tmp_path`.
- [ ] Implement report writer with aggregate metrics and per-example failures.
- [ ] Document usage in `docs/evals/batch-evals.md`.

## Acceptance Criteria

- `pytest evals/tests -v` passes.
- Evals package runs without the webapp or backend server.
- Fixtures cover CBT-Bench, Cactus, and internal feedback formats.
- Report includes metrics, provenance, provider/model, and prompt version metadata.
- Dataset license notes are documented.


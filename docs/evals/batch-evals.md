# Batch Evals

MindfulTrack batch evals are an offline Python package under `evals/`. The
pipeline reads local fixtures or exported audit/feedback JSONL, normalizes them
into `EvalExample`, runs a mockable model adapter, computes deterministic
metrics, and writes JSON reports. It does not import or require the FastAPI app.

## Run

```powershell
python -m evals.cli run --dataset evals/fixtures/internal_feedback_sample.jsonl --output evals/out/internal-feedback-report.json
```

In this worktree, Python is available through `uv`:

```powershell
uv run --with pytest python -m evals.cli run --dataset evals/fixtures/internal_feedback_sample.jsonl --output evals/out/internal-feedback-report.json
```

The CLI uses a deterministic mock adapter by default. Real provider calls are
disabled unless code explicitly passes a model adapter into `evals.runner`.

## Datasets

All committed fixtures are synthetic and intentionally small for CI. They are
format fixtures, not redistributions of full upstream datasets.

| Loader | Dataset | Fixture | License note |
| --- | --- | --- | --- |
| `load_cbt_bench_distortion_examples` | `Psychotherapy-LLM/CBT-Bench` | `evals/fixtures/cbt_bench_distortions_sample.json` | Hugging Face dataset card lists `cc-by-nc-4.0`; keep downstream use non-commercial unless reviewed. |
| `load_cactus_examples` | `LangAGI-Lab/cactus` | `evals/fixtures/cactus_sample.json` | Hugging Face dataset card lists `gpl`; review GPL compatibility before bundling real examples in product artifacts. |
| `load_internal_feedback_examples` | `mindfultrack/internal-feedback` | `evals/fixtures/internal_feedback_sample.jsonl` | Internal application export shape; fixture is synthetic and marked `internal-use-only`. |

Every normalized example includes dataset name, source URL or internal export
source, split/file metadata, transformation version, fixture path, synthetic
fixture flag, human-authored flag, and license.

## Metrics

- Distortion classification uses deterministic multi-label precision, recall,
  F1, and exact match.
- Reframe and accepted-response comparisons use normalized unique token overlap.
- Action plan generation can include checklist completeness for title,
  rationale, steps, timeframe, and concrete step presence.

These metrics are intentionally transparent and deterministic. LLM-as-judge can
be added later behind explicit provider configuration, but it is not needed for
CI or local fixture tests.

## Outputs

`run_examples` writes provider/model/prompt metadata plus per-example output and
provenance to JSONL. `build_report` writes a JSON summary with aggregate metrics,
dataset/license summaries, per-example metrics, and failures below the configured
threshold.

# Batch Evals

MindfulTrack batch evals are an offline Python package under `evals/`. The
pipeline reads local fixtures or exported audit/feedback JSONL, normalizes them
into `EvalExample`, runs a mockable model adapter, computes deterministic
metrics, and writes JSON reports. It does not import or require the FastAPI app.

## Run

```powershell
python -m evals.cli run --dataset evals/fixtures/internal_feedback_sample.jsonl --dataset-type internal-feedback --output evals/out/internal-feedback-report.json
```

In this worktree, Python is available through `uv`:

```powershell
uv run --with pytest python -m evals.cli run --dataset evals/fixtures/internal_feedback_sample.jsonl --dataset-type internal-feedback --output evals/out/internal-feedback-report.json
```

The CLI uses a deterministic mock adapter by default. Real provider calls are
disabled unless code explicitly passes a model adapter into `evals.runner`.
`--dataset-type` is required and accepts `internal-feedback`,
`cbt-bench-distortions`, `cactus`, or explicit `auto`. Auto mode only uses
recognizable filenames and refuses ambiguous names.

## Datasets

All committed fixtures are synthetic and intentionally small for CI. They are
format fixtures, not redistributions of full upstream datasets.

| Loader | Dataset | Fixture | License note |
| --- | --- | --- | --- |
| `load_cbt_bench_distortion_examples` | `Psychotherapy-LLM/CBT-Bench` | `evals/fixtures/cbt_bench_distortions_sample.json` | Hugging Face dataset card lists `cc-by-nc-4.0`; keep downstream use non-commercial unless reviewed. |
| `load_cactus_examples` | `LangAGI-Lab/cactus` | `evals/fixtures/cactus_sample.json` | Hugging Face dataset card lists `gpl`; review GPL compatibility before bundling real examples in product artifacts. |
| `load_internal_feedback_examples` | `mindfultrack/internal-feedback` | `evals/fixtures/internal_feedback_sample.jsonl` | Internal application export shape; fixture is synthetic and marked `internal-use-only`. |

Every normalized example includes dataset name, source URL or internal export
source, split/file metadata, transformation version, fixture path for committed
fixtures, synthetic fixture flag, human-authored flag, and license.

Committed fixtures are inferred as synthetic and non-human-authored only when
the resolved path is inside this repository's `evals/fixtures/` directory.
Internal exports outside that repo-root-relative fixture path default to
non-synthetic and human-authored, because they may contain real user-authored CBT
content. Loader callers can pass `provenance_overrides` to correct source file,
split, synthetic fixture, or human-authored metadata for redacted fixtures and
real upstream datasets.

The internal feedback loader is defensive against partially populated exports.
Rows with `feedback_event`, `audit_log`, or nested response payload values set to
`null` or another non-object value are normalized through empty mappings instead
of aborting the whole eval run. This keeps batch processing resilient while
preserving per-example provenance and defaulted metadata for review.

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

Reports and `.results.jsonl` files can contain sensitive user-authored
therapeutic content from internal exports. They should not be committed or shared
outside the approved review context. Generated eval output paths such as
`evals/out/`, `evals/reports/`, and `*.results.jsonl` are intentionally ignored
by git.

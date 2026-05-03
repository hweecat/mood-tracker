from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from evals.datasets import (
    load_cactus_examples,
    load_cbt_bench_distortion_examples,
    load_internal_feedback_examples,
)
from evals.normalization import EvalExample
from evals.reporting import build_report, write_report
from evals.runner import run_examples


DEFAULT_PROVIDER = "mock-provider"
DEFAULT_MODEL = "mock-cbt-v1"
DEFAULT_PROMPT_VERSION = "cbt-eval-v1"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m evals.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run offline evals over a fixture/export")
    run_parser.add_argument("--dataset", required=True, type=Path)
    run_parser.add_argument("--output", required=True, type=Path)
    run_parser.add_argument("--provider", default=DEFAULT_PROVIDER)
    run_parser.add_argument("--model", default=DEFAULT_MODEL)
    run_parser.add_argument("--prompt-version", default=DEFAULT_PROMPT_VERSION)

    args = parser.parse_args(argv)
    if args.command == "run":
        examples = _load_examples(args.dataset)
        results = run_examples(
            examples,
            model_adapter=_mock_model_adapter,
            output_path=args.output.with_suffix(".results.jsonl"),
            provider=args.provider,
            model=args.model,
            prompt_version=args.prompt_version,
        )
        report = build_report(
            results,
            provider=args.provider,
            model=args.model,
            prompt_version=args.prompt_version,
        )
        write_report(report, args.output)
        print(f"Wrote eval report to {args.output}")
        return 0

    parser.error(f"Unsupported command: {args.command}")
    return 2


def _load_examples(path: Path) -> list[EvalExample]:
    name = path.name.lower()
    if name.endswith(".jsonl") or "internal_feedback" in name:
        return load_internal_feedback_examples(path)
    if "cactus" in name:
        return load_cactus_examples(path)
    return load_cbt_bench_distortion_examples(path)


def _mock_model_adapter(example: EvalExample) -> dict[str, Any]:
    if example.task == "distortion_classification":
        return {"distortions": example.reference.get("distortions", [])}
    if example.task == "cbt_action_plan_generation":
        cbt_plan = str(example.reference.get("cbt_plan", ""))
        return {
            "cbt_plan": cbt_plan,
            "action_plan": {
                "title": "Mock action plan",
                "rationale": "Local deterministic fixture response.",
                "steps": [cbt_plan],
                "timeframe": "today",
            },
        }
    if example.task == "user_preference_alignment":
        return {
            "response": example.reference.get("accepted_response", ""),
            "action_plan": example.reference.get("accepted_action_plan", {}),
        }
    return {}


if __name__ == "__main__":
    raise SystemExit(main())

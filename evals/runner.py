from __future__ import annotations

import json
from collections.abc import Callable, Iterable, Mapping
from pathlib import Path
from typing import Any

from evals.normalization import EvalExample


ModelAdapter = Callable[[EvalExample], Mapping[str, Any]]


class ProviderCallsDisabledError(RuntimeError):
    """Raised when a run is attempted without an explicit mock/provider adapter."""


def run_examples(
    examples: Iterable[EvalExample],
    *,
    model_adapter: ModelAdapter | None,
    output_path: Path,
    provider: str,
    model: str,
    prompt_version: str,
) -> list[dict[str, Any]]:
    if model_adapter is None:
        raise ProviderCallsDisabledError(
            "Provider calls are disabled by default; pass a model_adapter callable."
        )

    results = [
        _run_one(
            example,
            model_adapter=model_adapter,
            provider=provider,
            model=model,
            prompt_version=prompt_version,
        )
        for example in examples
    ]
    _write_jsonl(output_path, results)
    return results


def _run_one(
    example: EvalExample,
    *,
    model_adapter: ModelAdapter,
    provider: str,
    model: str,
    prompt_version: str,
) -> dict[str, Any]:
    output = model_adapter(example)
    return {
        "example_id": example.id,
        "dataset": example.dataset,
        "task": example.task,
        "provider": provider,
        "model": model,
        "prompt_version": prompt_version,
        "output": dict(output),
        "reference": example.reference,
        "provenance": example.provenance,
        "license": example.license,
    }


def _write_jsonl(path: Path, rows: Iterable[Mapping[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as result_file:
        for row in rows:
            result_file.write(json.dumps(row, sort_keys=True) + "\n")

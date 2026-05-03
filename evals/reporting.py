from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any

from evals.metrics import (
    action_plan_checklist_completeness,
    score_multilabel_classification,
    token_overlap_similarity,
)


def build_report(
    results: Iterable[Mapping[str, Any]],
    *,
    provider: str,
    model: str,
    prompt_version: str,
    failure_threshold: float = 0.75,
) -> dict[str, Any]:
    scored_results = [_score_result(result) for result in results]
    primary_scores = [result["primary_score"] for result in scored_results]
    failures = [
        {
            "example_id": result["example_id"],
            "dataset": result["dataset"],
            "task": result["task"],
            "primary_score": result["primary_score"],
        }
        for result in scored_results
        if result["primary_score"] < failure_threshold
    ]

    return {
        "summary": {
            "example_count": len(scored_results),
            "provider": provider,
            "model": model,
            "prompt_version": prompt_version,
            "failure_threshold": failure_threshold,
        },
        "aggregate_metrics": {
            "mean_primary_score": _mean(primary_scores),
            "failure_count": len(failures),
        },
        "datasets": _dataset_summaries(scored_results),
        "failures": failures,
        "results": scored_results,
    }


def write_report(report: Mapping[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")


def _score_result(result: Mapping[str, Any]) -> dict[str, Any]:
    task = str(result.get("task", ""))
    output = result.get("output", {})
    reference = result.get("reference", {})
    if not isinstance(output, Mapping):
        output = {}
    if not isinstance(reference, Mapping):
        reference = {}

    metrics: dict[str, Any]
    primary_score: float

    if task == "distortion_classification":
        metrics = {
            "classification": score_multilabel_classification(
                predicted=output.get("distortions", []),
                reference=reference.get("distortions", []),
            )
        }
        primary_score = metrics["classification"]["f1"]
    elif task == "cbt_action_plan_generation":
        metrics = {
            "token_overlap": token_overlap_similarity(
                generated=str(output.get("cbt_plan", "")),
                accepted=str(reference.get("cbt_plan", "")),
            )
        }
        if isinstance(output.get("action_plan"), Mapping):
            metrics["action_plan_checklist"] = action_plan_checklist_completeness(
                output["action_plan"]
            )
        primary_score = metrics["token_overlap"]["f1"]
    elif task == "user_preference_alignment":
        metrics = {
            "token_overlap": token_overlap_similarity(
                generated=str(output.get("response", "")),
                accepted=str(reference.get("accepted_response", "")),
            )
        }
        if isinstance(output.get("action_plan"), Mapping):
            metrics["action_plan_checklist"] = action_plan_checklist_completeness(
                output["action_plan"]
            )
        primary_score = metrics["token_overlap"]["f1"]
    else:
        metrics = {"unsupported_task": {"task": task}}
        primary_score = 0.0

    scored = dict(result)
    scored["metrics"] = metrics
    scored["primary_score"] = primary_score
    return scored


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _dataset_summaries(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    summaries: dict[tuple[str, str, str, bool], dict[str, Any]] = {}
    for result in results:
        provenance = result.get("provenance", {})
        if not isinstance(provenance, Mapping):
            provenance = {}
        key = (
            str(result.get("dataset", "")),
            str(result.get("license", "")),
            str(provenance.get("source_url", "")),
            bool(provenance.get("is_synthetic_fixture", False)),
        )
        summaries[key] = {
            "dataset": key[0],
            "license": key[1],
            "source_url": key[2],
            "synthetic_fixture": key[3],
        }
    return [summaries[key] for key in sorted(summaries)]

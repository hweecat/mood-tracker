from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from typing import Any


def score_multilabel_classification(
    predicted: Iterable[str],
    reference: Iterable[str],
) -> dict[str, Any]:
    predicted_set = _normalize_label_set(predicted)
    reference_set = _normalize_label_set(reference)
    true_positives = len(predicted_set & reference_set)
    false_positives = len(predicted_set - reference_set)
    false_negatives = len(reference_set - predicted_set)

    precision = _safe_divide(true_positives, true_positives + false_positives)
    recall = _safe_divide(true_positives, true_positives + false_negatives)
    f1 = _safe_divide(2 * precision * recall, precision + recall)

    return {
        "true_positives": true_positives,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "exact_match": predicted_set == reference_set,
        "predicted_labels": sorted(predicted_set),
        "reference_labels": sorted(reference_set),
    }


def token_overlap_similarity(generated: str, accepted: str) -> dict[str, Any]:
    generated_tokens = set(_tokens(generated))
    accepted_tokens = set(_tokens(accepted))
    overlap_tokens = sorted(generated_tokens & accepted_tokens)

    precision = _safe_divide(len(overlap_tokens), len(generated_tokens))
    recall = _safe_divide(len(overlap_tokens), len(accepted_tokens))
    f1 = _safe_divide(2 * precision * recall, precision + recall)
    jaccard = _safe_divide(len(overlap_tokens), len(generated_tokens | accepted_tokens))

    return {
        "overlap_tokens": overlap_tokens,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "jaccard": jaccard,
        "generated_token_count": len(generated_tokens),
        "accepted_token_count": len(accepted_tokens),
    }


def action_plan_checklist_completeness(plan: Mapping[str, Any]) -> dict[str, Any]:
    checks = {
        "title": bool(str(plan.get("title", "")).strip()),
        "rationale": bool(str(plan.get("rationale", "")).strip()),
        "steps": bool(_non_empty_steps(plan.get("steps"))),
        "timeframe": bool(str(plan.get("timeframe", "")).strip()),
        "concrete_step": any(_looks_concrete(step) for step in _non_empty_steps(plan.get("steps"))),
    }
    present_items = [name for name, present in checks.items() if present]
    missing_items = [name for name, present in checks.items() if not present]

    return {
        "score": _safe_divide(len(present_items), len(checks)),
        "present_items": present_items,
        "missing_items": missing_items,
        "total_items": len(checks),
    }


def _normalize_label_set(labels: Iterable[str]) -> set[str]:
    return {str(label).strip().lower() for label in labels if str(label).strip()}


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _non_empty_steps(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if not isinstance(value, Iterable):
        return []
    return [str(step).strip() for step in value if str(step).strip()]


def _looks_concrete(step: str) -> bool:
    return len(_tokens(step)) >= 3


def _safe_divide(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator

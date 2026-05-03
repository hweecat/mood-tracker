from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from evals.normalization import EvalExample


CBT_BENCH_PROVENANCE = {
    "source_url": "https://huggingface.co/datasets/Psychotherapy-LLM/CBT-Bench",
    "source_file": "distortions_test.json",
    "split": "test",
    "transformation_version": "mindfultrack-evals-v1",
    "is_synthetic_fixture": True,
    "human_authored": False,
}

CACTUS_PROVENANCE = {
    "source_url": "https://huggingface.co/datasets/LangAGI-Lab/cactus",
    "source_file": "train",
    "split": "train",
    "transformation_version": "mindfultrack-evals-v1",
    "is_synthetic_fixture": True,
    "human_authored": False,
}

INTERNAL_FEEDBACK_PROVENANCE = {
    "source_url": "internal ai_feedback_events export",
    "source_file": "ai_feedback_events_with_audit.jsonl",
    "split": "local",
    "transformation_version": "mindfultrack-evals-v1",
    "is_synthetic_fixture": True,
    "human_authored": False,
}


def load_cbt_bench_distortion_examples(path: Path) -> list[EvalExample]:
    records = _load_json_records(path)
    examples: list[EvalExample] = []

    for index, record in enumerate(records):
        automatic_thought = _first_present(record, "automatic_thought", "thoughts", "thought")
        distortions = _as_list(
            _first_present(record, "distortions", "cognitive_distortions", "labels")
        )
        situation = record.get("situation")

        examples.append(
            EvalExample(
                id=str(record.get("id", f"cbt-bench-distortion-{index + 1}")),
                dataset="Psychotherapy-LLM/CBT-Bench",
                task="distortion_classification",
                input={
                    "automatic_thought": automatic_thought,
                    "situation": situation,
                },
                reference={"distortions": distortions},
                provenance=CBT_BENCH_PROVENANCE | {"fixture_path": str(path)},
                license="cc-by-nc-4.0",
                metadata={"source_record_index": index},
            )
        )

    return examples


def load_cactus_examples(path: Path) -> list[EvalExample]:
    records = _load_json_records(path)
    examples: list[EvalExample] = []

    for index, record in enumerate(records):
        examples.append(
            EvalExample(
                id=str(record.get("id", f"cactus-{index + 1}")),
                dataset="LangAGI-Lab/cactus",
                task="cbt_action_plan_generation",
                input={
                    "automatic_thought": record.get("thought", ""),
                    "patterns": _as_list(record.get("patterns", [])),
                    "intake_form": record.get("intake_form"),
                    "cbt_technique": record.get("cbt_technique"),
                    "attitude": record.get("attitude"),
                },
                reference={"cbt_plan": record.get("cbt_plan", "")},
                provenance=CACTUS_PROVENANCE | {"fixture_path": str(path)},
                license="gpl",
                metadata={
                    "source_record_index": index,
                    "has_dialogue_reference": bool(record.get("dialogue")),
                },
            )
        )

    return examples


def load_internal_feedback_examples(path: Path) -> list[EvalExample]:
    records = _load_jsonl_records(path)
    examples: list[EvalExample] = []

    for index, record in enumerate(records):
        feedback = record.get("feedback_event", {})
        audit = record.get("audit_log", {})
        response_payload = audit.get("response_payload", {})
        generated_reframe = _first_text_item(response_payload.get("reframes"), "content")
        generated_action_plan = _first_text_item(response_payload.get("actionPlans"), "title")
        accepted_reframe = feedback.get("accepted_reframe_payload") or {}
        accepted_action_plan = feedback.get("accepted_action_plan_payload") or {}

        examples.append(
            EvalExample(
                id=str(feedback.get("id", f"internal-feedback-{index + 1}")),
                dataset="mindfultrack/internal-feedback",
                task="user_preference_alignment",
                input={
                    "masked_request_payload": audit.get("masked_request_payload", {}),
                    "generated_reframe": generated_reframe,
                    "generated_action_plan": generated_action_plan,
                    "generated_response_payload": response_payload,
                },
                reference={
                    "accepted_response": _first_present(
                        feedback,
                        "user_rational_response",
                        "accepted_rational_response",
                    )
                    or accepted_reframe.get("content", ""),
                    "accepted_reframe": accepted_reframe,
                    "accepted_action_plan": accepted_action_plan,
                    "user_action_plan": feedback.get("user_action_plan", ""),
                    "accepted_distortions": feedback.get(
                        "accepted_distortions_payload", []
                    ),
                    "source": feedback.get("source"),
                },
                provenance=INTERNAL_FEEDBACK_PROVENANCE
                | {
                    "fixture_path": str(path),
                    "audit_log_id": audit.get("id"),
                    "feedback_event_id": feedback.get("id"),
                },
                license="internal-use-only",
                metadata={
                    "source_record_index": index,
                    "provider": audit.get("provider"),
                    "model": audit.get("model"),
                    "prompt_version_id": audit.get("prompt_version_id"),
                    "operation": audit.get("operation"),
                    "status": audit.get("status"),
                    "schema_version": audit.get("schema_version"),
                    "feedback_source": feedback.get("source"),
                },
            )
        )

    return examples


def _load_json_records(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as fixture:
        payload = json.load(fixture)

    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("examples", "data", "rows"):
            records = payload.get(key)
            if isinstance(records, list):
                return records
    raise ValueError(f"Expected {path} to contain a JSON list or object with examples")


def _load_jsonl_records(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fixture:
        for line_number, line in enumerate(fixture, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            payload = json.loads(stripped)
            if not isinstance(payload, dict):
                raise ValueError(f"Expected JSON object on line {line_number} in {path}")
            records.append(payload)
    return records


def _first_present(record: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return ""


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    return [str(value)]


def _first_text_item(value: Any, key: str) -> str:
    if isinstance(value, list) and value:
        first = value[0]
        if isinstance(first, dict):
            return str(first.get(key, ""))
        return str(first)
    if isinstance(value, dict):
        return str(value.get(key, ""))
    if value is None:
        return ""
    return str(value)

from pathlib import Path

from evals.datasets import (
    load_cactus_examples,
    load_cbt_bench_distortion_examples,
    load_internal_feedback_examples,
)


def test_load_cbt_bench_distortion_fixture():
    examples = load_cbt_bench_distortion_examples(
        Path("evals/fixtures/cbt_bench_distortions_sample.json")
    )

    assert examples[0].dataset == "Psychotherapy-LLM/CBT-Bench"
    assert examples[0].task == "distortion_classification"
    assert "automatic_thought" in examples[0].input
    assert examples[0].reference["distortions"]
    assert examples[0].provenance["is_synthetic_fixture"] is True
    assert examples[0].provenance["human_authored"] is False


def test_load_cactus_fixture():
    examples = load_cactus_examples(Path("evals/fixtures/cactus_sample.json"))

    assert examples[0].dataset == "LangAGI-Lab/cactus"
    assert examples[0].task == "cbt_action_plan_generation"
    assert examples[0].reference["cbt_plan"]
    assert examples[0].provenance["is_synthetic_fixture"] is True
    assert examples[0].provenance["human_authored"] is False


def test_load_internal_feedback_fixture():
    examples = load_internal_feedback_examples(
        Path("evals/fixtures/internal_feedback_sample.jsonl")
    )

    assert examples[0].dataset == "mindfultrack/internal-feedback"
    assert examples[0].task == "user_preference_alignment"
    assert examples[0].input["generated_reframe"]
    assert examples[0].reference["accepted_response"]
    assert examples[0].metadata["provider"] == "mock-provider"
    assert examples[0].provenance["is_synthetic_fixture"] is True
    assert examples[0].provenance["human_authored"] is False


def test_internal_feedback_real_export_defaults_to_human_authored_non_synthetic(tmp_path):
    export_path = tmp_path / "ai_feedback_events_with_audit.jsonl"
    export_path.write_text(
        Path("evals/fixtures/internal_feedback_sample.jsonl").read_text(
            encoding="utf-8"
        ),
        encoding="utf-8",
    )

    examples = load_internal_feedback_examples(export_path)

    assert examples[0].provenance["is_synthetic_fixture"] is False
    assert examples[0].provenance["human_authored"] is True
    assert "fixture_path" not in examples[0].provenance


def test_external_evals_fixtures_path_is_not_marked_synthetic(tmp_path):
    export_path = tmp_path / "evals" / "fixtures" / "export.jsonl"
    export_path.parent.mkdir(parents=True)
    export_path.write_text(
        Path("evals/fixtures/internal_feedback_sample.jsonl").read_text(
            encoding="utf-8"
        ),
        encoding="utf-8",
    )

    examples = load_internal_feedback_examples(export_path)

    assert examples[0].provenance["is_synthetic_fixture"] is False
    assert examples[0].provenance["human_authored"] is True
    assert "fixture_path" not in examples[0].provenance


def test_internal_feedback_provenance_can_be_overridden_by_caller(tmp_path):
    export_path = tmp_path / "redacted_internal_feedback.jsonl"
    export_path.write_text(
        Path("evals/fixtures/internal_feedback_sample.jsonl").read_text(
            encoding="utf-8"
        ),
        encoding="utf-8",
    )

    examples = load_internal_feedback_examples(
        export_path,
        provenance_overrides={
            "source_url": "internal redacted fixture",
            "is_synthetic_fixture": True,
            "human_authored": False,
        },
    )

    assert examples[0].provenance["source_url"] == "internal redacted fixture"
    assert examples[0].provenance["is_synthetic_fixture"] is True
    assert examples[0].provenance["human_authored"] is False


def test_public_loaders_accept_source_metadata_for_real_upstream_data(tmp_path):
    cbt_path = tmp_path / "cbt_bench_distortions_export.json"
    cactus_path = tmp_path / "cactus_export.json"
    cbt_path.write_text(
        Path("evals/fixtures/cbt_bench_distortions_sample.json").read_text(
            encoding="utf-8"
        ),
        encoding="utf-8",
    )
    cactus_path.write_text(
        Path("evals/fixtures/cactus_sample.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    cbt_examples = load_cbt_bench_distortion_examples(
        cbt_path,
        provenance_overrides={
            "source_file": "distortions_train.json",
            "split": "train",
            "is_synthetic_fixture": False,
            "human_authored": True,
        },
    )
    cactus_examples = load_cactus_examples(
        cactus_path,
        provenance_overrides={
            "source_file": "train.jsonl",
            "split": "train",
            "is_synthetic_fixture": False,
            "human_authored": True,
        },
    )

    assert cbt_examples[0].provenance["source_file"] == "distortions_train.json"
    assert cbt_examples[0].provenance["split"] == "train"
    assert cbt_examples[0].provenance["is_synthetic_fixture"] is False
    assert cbt_examples[0].provenance["human_authored"] is True
    assert "fixture_path" not in cbt_examples[0].provenance
    assert cactus_examples[0].provenance["source_file"] == "train.jsonl"
    assert cactus_examples[0].provenance["is_synthetic_fixture"] is False
    assert cactus_examples[0].provenance["human_authored"] is True
    assert "fixture_path" not in cactus_examples[0].provenance


def test_public_loader_examples_have_independent_provenance_dicts(tmp_path):
    cbt_path = tmp_path / "cbt_bench_distortions_export.json"
    cactus_path = tmp_path / "cactus_export.json"
    cbt_path.write_text(
        """[
  {"id": "cbt-1", "automatic_thought": "I always fail", "distortions": ["All-or-Nothing Thinking"]},
  {"id": "cbt-2", "automatic_thought": "No one cares", "distortions": ["Mind Reading"]}
]""",
        encoding="utf-8",
    )
    cactus_path.write_text(
        """[
  {"id": "cactus-1", "thought": "I froze", "cbt_plan": "Take one small step"},
  {"id": "cactus-2", "thought": "I avoided it", "cbt_plan": "Name the next action"}
]""",
        encoding="utf-8",
    )

    cbt_examples = load_cbt_bench_distortion_examples(cbt_path)
    cactus_examples = load_cactus_examples(cactus_path)

    cbt_examples[0].provenance["report_row"] = "first"
    cactus_examples[0].provenance["report_row"] = "first"

    assert cbt_examples[0].provenance is not cbt_examples[1].provenance
    assert cactus_examples[0].provenance is not cactus_examples[1].provenance
    assert "report_row" not in cbt_examples[1].provenance
    assert "report_row" not in cactus_examples[1].provenance


def test_load_internal_feedback_handles_null_nested_records(tmp_path):
    export_path = tmp_path / "ai_feedback_events_with_nulls.jsonl"
    export_path.write_text("""{"feedback_event": null, "audit_log": null}
{"feedback_event": 7, "audit_log": "bad"}
""", encoding="utf-8")

    examples = load_internal_feedback_examples(export_path)

    assert len(examples) == 2
    assert examples[0].input["generated_response_payload"] == {}
    assert examples[0].reference["accepted_response"] == ""
    assert examples[1].metadata["provider"] is None


def test_load_internal_feedback_coerces_truthy_non_object_accepted_payloads(tmp_path):
    export_path = tmp_path / "ai_feedback_events_with_bad_accepted_payloads.jsonl"
    export_path.write_text(
        """{"feedback_event": {"accepted_reframe_payload": "bad", "accepted_action_plan_payload": 7}, "audit_log": {"response_payload": {}}}
""",
        encoding="utf-8",
    )

    examples = load_internal_feedback_examples(export_path)

    assert examples[0].reference["accepted_response"] == ""
    assert examples[0].reference["accepted_reframe"] == {}
    assert examples[0].reference["accepted_action_plan"] == {}

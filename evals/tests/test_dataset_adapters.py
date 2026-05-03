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


def test_load_cactus_fixture():
    examples = load_cactus_examples(Path("evals/fixtures/cactus_sample.json"))

    assert examples[0].dataset == "LangAGI-Lab/cactus"
    assert examples[0].task == "cbt_action_plan_generation"
    assert examples[0].reference["cbt_plan"]


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

import json
from pathlib import Path

import pytest

from evals.datasets import load_cbt_bench_distortion_examples
from evals.runner import ProviderCallsDisabledError, run_examples


def test_run_examples_writes_jsonl_results_with_provider_metadata(tmp_path):
    examples = load_cbt_bench_distortion_examples(
        Path("evals/fixtures/cbt_bench_distortions_sample.json")
    )
    output_path = tmp_path / "results.jsonl"

    def fake_provider(example):
        return {"distortions": example.reference["distortions"]}

    results = run_examples(
        examples,
        model_adapter=fake_provider,
        output_path=output_path,
        provider="mock-provider",
        model="mock-cbt-v1",
        prompt_version="cbt-eval-v1",
    )

    written = [json.loads(line) for line in output_path.read_text().splitlines()]
    assert results == written
    assert written[0]["example_id"] == examples[0].id
    assert written[0]["provider"] == "mock-provider"
    assert written[0]["model"] == "mock-cbt-v1"
    assert written[0]["prompt_version"] == "cbt-eval-v1"
    assert written[0]["output"]["distortions"] == examples[0].reference["distortions"]
    assert written[0]["provenance"]["source_url"]


def test_run_examples_requires_explicit_model_adapter(tmp_path):
    examples = load_cbt_bench_distortion_examples(
        Path("evals/fixtures/cbt_bench_distortions_sample.json")
    )

    with pytest.raises(ProviderCallsDisabledError):
        run_examples(
            examples,
            model_adapter=None,
            output_path=tmp_path / "results.jsonl",
            provider="disabled",
            model="disabled",
            prompt_version="cbt-eval-v1",
        )

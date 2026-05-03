import json
import subprocess
import sys

import pytest


def test_cli_run_writes_internal_feedback_report(tmp_path):
    output_path = tmp_path / "internal-feedback-report.json"

    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "evals.cli",
            "run",
            "--dataset",
            "evals/fixtures/internal_feedback_sample.jsonl",
            "--output",
            str(output_path),
        ],
        capture_output=True,
        check=True,
        text=True,
    )

    report = json.loads(output_path.read_text(encoding="utf-8"))
    assert str(output_path) in completed.stdout
    assert report["summary"]["example_count"] == 1
    assert report["summary"]["provider"] == "mock-provider"
    assert report["summary"]["model"] == "mock-cbt-v1"
    assert report["summary"]["prompt_version"] == "cbt-eval-v1"
    assert report["aggregate_metrics"]["mean_primary_score"] == pytest.approx(1.0)
    assert report["failures"] == []
    assert report["datasets"] == [
        {
            "dataset": "mindfultrack/internal-feedback",
            "license": "internal-use-only",
            "source_url": "internal ai_feedback_events export",
            "synthetic_fixture": True,
        }
    ]
    assert report["results"][0]["metrics"]["token_overlap"]["f1"] == pytest.approx(1.0)
    assert report["results"][0]["provenance"]["source_url"] == "internal ai_feedback_events export"

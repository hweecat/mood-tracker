from pathlib import Path


def test_eval_output_artifacts_are_gitignored():
    ignored_patterns = {
        line.strip()
        for line in Path(".gitignore").read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }

    assert "evals/out/" in ignored_patterns
    assert "evals/reports/" in ignored_patterns
    assert "*.results.jsonl" in ignored_patterns


def test_eval_docs_warn_reports_can_contain_sensitive_user_authored_content():
    docs = Path("docs/evals/batch-evals.md").read_text(encoding="utf-8").lower()

    assert "sensitive user-authored" in docs
    assert "not be committed or shared" in docs

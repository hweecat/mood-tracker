import pytest

from evals.metrics import (
    action_plan_checklist_completeness,
    score_multilabel_classification,
    token_overlap_similarity,
)


def test_score_multilabel_classification_reports_exact_and_overlap_metrics():
    partial = score_multilabel_classification(
        predicted=["Mind Reading", "catastrophizing"],
        reference=["mind reading", "overgeneralization"],
    )
    exact = score_multilabel_classification(
        predicted=["mind reading", "overgeneralization"],
        reference=["overgeneralization", "mind reading"],
    )

    assert partial["true_positives"] == 1
    assert partial["false_positives"] == 1
    assert partial["false_negatives"] == 1
    assert partial["precision"] == pytest.approx(0.5)
    assert partial["recall"] == pytest.approx(0.5)
    assert partial["f1"] == pytest.approx(0.5)
    assert partial["exact_match"] is False
    assert exact["exact_match"] is True
    assert exact["f1"] == pytest.approx(1.0)


def test_token_overlap_similarity_uses_unique_normalized_tokens():
    score = token_overlap_similarity(
        generated="Take one walk and send one message.",
        accepted="Send one message and take a breath.",
    )

    assert score["overlap_tokens"] == ["and", "message", "one", "send", "take"]
    assert score["precision"] == pytest.approx(5 / 6)
    assert score["recall"] == pytest.approx(5 / 7)
    assert score["f1"] == pytest.approx(10 / 13)
    assert score["jaccard"] == pytest.approx(5 / 8)


def test_action_plan_checklist_completeness_scores_required_fields_and_steps():
    score = action_plan_checklist_completeness(
        {
            "title": "Ask for feedback",
            "rationale": "A clear question reduces guessing.",
            "steps": ["Send one concise follow-up", ""],
            "timeframe": "tomorrow",
        }
    )

    assert score["score"] == pytest.approx(1.0)
    assert score["present_items"] == [
        "title",
        "rationale",
        "steps",
        "timeframe",
        "concrete_step",
    ]
    assert score["missing_items"] == []

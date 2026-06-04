import json
import logging
import sqlite3

from fastapi.testclient import TestClient

from app.api.v1.routes import cbt_logs
from app.db import session
from app.main import app


def test_create_cbt_log_captures_ai_feedback_event(tmp_path):
    db_path = tmp_path / "data" / "mood-tracker.db"
    original_database_path = session.DATABASE_PATH
    session.DATABASE_PATH = str(db_path)
    try:
        session.init_db()
    finally:
        session.DATABASE_PATH = original_database_path
    ai_response_payload = {
        "suggestions": [
            {
                "id": "suggestion-1",
                "distortion": "All-or-Nothing Thinking",
                "reasoning": "Uses all-or-nothing language.",
            },
            {
                "id": "suggestion-2",
                "distortion": "Catastrophizing",
                "reasoning": "Jumps to worst-case outcome.",
            },
        ],
        "reframes": [
            {
                "id": "reframe-1",
                "perspective": "Balanced",
                "content": "I missed one deadline, and I can recover.",
            },
            {
                "id": "reframe-2",
                "perspective": "Compassionate",
                "content": "This is stressful, and one mistake is not my whole story.",
            },
        ],
        "actionPlans": [
            {
                "id": "plan-1",
                "title": "Email my teacher",
                "steps": ["Ask about a revised deadline"],
            }
        ],
    }
    _insert_audit_log(
        db_path,
        audit_id="audit-1",
        user_id="1",
        response_payload=ai_response_payload,
    )

    def override_get_db():
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[cbt_logs.get_db] = override_get_db
    try:
        client = TestClient(app)
        response = client.post(
            "/api/v1/cbt-logs/",
            json={
                "id": "cbt-1",
                "timestamp": 1710000200,
                "situation": "I missed a deadline",
                "automaticThoughts": "I always fail",
                "distortions": ["All-or-Nothing Thinking"],
                "rationalResponse": "I missed one deadline, and I can recover.",
                "moodBefore": 3,
                "moodAfter": 6,
                "behavioralLink": "Email my teacher",
                "aiSuggestedDistortions": [
                    "All-or-Nothing Thinking",
                    "Catastrophizing",
                ],
                "aiAnalysisId": "audit-1",
                "acceptedDistortionsPayload": [
                    {
                        "id": "suggestion-1",
                        "distortion": "All-or-Nothing Thinking",
                        "reasoning": "Uses all-or-nothing language.",
                    }
                ],
                "ignoredDistortionsPayload": [
                    {
                        "id": "suggestion-2",
                        "distortion": "Catastrophizing",
                        "reasoning": "Jumps to worst-case outcome.",
                    }
                ],
                "acceptedReframeId": "reframe-1",
                "ignoredReframeIds": ["reframe-2"],
                "acceptedReframePayload": {
                    "id": "reframe-1",
                    "perspective": "Balanced",
                    "content": "I missed one deadline, and I can recover.",
                },
                "ignoredReframesPayload": [
                    {
                        "id": "reframe-2",
                        "perspective": "Compassionate",
                        "content": "This is stressful, and one mistake is not my whole story.",
                    }
                ],
                "acceptedActionPlanId": "plan-1",
                "acceptedActionPlanPayload": {
                    "id": "plan-1",
                    "title": "Email my teacher",
                    "steps": ["Ask about a revised deadline"],
                },
                "feedbackSource": "edited_ai",
            },
        )
    finally:
        app.dependency_overrides.pop(cbt_logs.get_db, None)

    assert response.status_code == 200

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    try:
        row = db.execute("SELECT * FROM ai_feedback_events").fetchone()
    finally:
        db.close()

    assert row is not None
    assert row["audit_log_id"] == "audit-1"
    assert row["user_id"] == "1"
    assert row["cbt_log_id"] == "cbt-1"
    assert json.loads(row["ai_suggestions_payload"]) == ai_response_payload["suggestions"]
    assert json.loads(row["ai_reframes_payload"]) == ai_response_payload["reframes"]
    assert json.loads(row["ai_action_plans_payload"]) == ai_response_payload["actionPlans"]
    assert json.loads(row["accepted_distortions_payload"]) == [
        {
            "id": "suggestion-1",
            "distortion": "All-or-Nothing Thinking",
            "reasoning": "Uses all-or-nothing language.",
        }
    ]
    assert json.loads(row["ignored_distortions_payload"]) == [
        {
            "id": "suggestion-2",
            "distortion": "Catastrophizing",
            "reasoning": "Jumps to worst-case outcome.",
        }
    ]
    assert json.loads(row["accepted_reframe_payload"]) == {
        "id": "reframe-1",
        "perspective": "Balanced",
        "content": "I missed one deadline, and I can recover.",
    }
    assert json.loads(row["ignored_reframes_payload"]) == [
        {
            "id": "reframe-2",
            "perspective": "Compassionate",
            "content": "This is stressful, and one mistake is not my whole story.",
        }
    ]
    assert row["user_rational_response"] == "I missed one deadline, and I can recover."
    assert json.loads(row["accepted_action_plan_payload"]) == {
        "id": "plan-1",
        "title": "Email my teacher",
        "steps": ["Ask about a revised deadline"],
    }
    assert row["user_action_plan"] == "Email my teacher"
    assert row["source"] == "edited_ai"


def test_create_cbt_log_does_not_log_raw_sensitive_feedback_text(tmp_path, caplog):
    db_path = tmp_path / "data" / "mood-tracker.db"
    original_database_path = session.DATABASE_PATH
    session.DATABASE_PATH = str(db_path)
    try:
        session.init_db()
    finally:
        session.DATABASE_PATH = original_database_path

    def override_get_db():
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    sensitive_text = "My email is jane@example.com and I feel hopeless"
    app.dependency_overrides[cbt_logs.get_db] = override_get_db
    try:
        client = TestClient(app)
        with caplog.at_level(logging.INFO):
            response = client.post(
                "/api/v1/cbt-logs/",
                json={
                    "id": "cbt-private",
                    "timestamp": 1710000300,
                    "situation": sensitive_text,
                    "automaticThoughts": sensitive_text,
                    "distortions": ["Catastrophizing"],
                    "rationalResponse": sensitive_text,
                    "moodBefore": 2,
                    "moodAfter": 4,
                    "behavioralLink": sensitive_text,
                    "aiAnalysisId": "audit-private",
                    "acceptedReframeId": "reframe-private",
                    "feedbackSource": "edited_ai",
                },
            )
    finally:
        app.dependency_overrides.pop(cbt_logs.get_db, None)

    assert response.status_code == 200
    for record in caplog.records:
        assert "jane@example.com" not in record.getMessage()
        assert "jane@example.com" not in str(record.__dict__)


def _insert_audit_log(
    db_path,
    audit_id: str,
    user_id: str,
    response_payload: dict | None = None,
) -> None:
    db = sqlite3.connect(db_path)
    try:
        db.execute(
            """
            INSERT INTO ai_audit_logs (
                id, correlation_id, user_id, operation, provider, model,
                response_payload, latency_ms, status, schema_version, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                audit_id,
                f"corr-{audit_id}",
                user_id,
                "analyze_cbt",
                "gemini",
                "gemini-1.5-flash",
                json.dumps(response_payload, sort_keys=True) if response_payload else None,
                25,
                "success",
                1,
                1710000100,
            ),
        )
        db.commit()
    finally:
        db.close()

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
                "acceptedReframeId": "reframe-1",
                "ignoredReframeIds": ["reframe-2"],
                "acceptedActionPlanId": "plan-1",
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
    assert json.loads(row["accepted_distortions_payload"]) == [
        {"distortion": "All-or-Nothing Thinking"}
    ]
    assert json.loads(row["ignored_distortions_payload"]) == [
        {"distortion": "Catastrophizing"}
    ]
    assert json.loads(row["accepted_reframe_payload"]) == {"id": "reframe-1"}
    assert json.loads(row["ignored_reframes_payload"]) == [{"id": "reframe-2"}]
    assert row["user_rational_response"] == "I missed one deadline, and I can recover."
    assert json.loads(row["accepted_action_plan_payload"]) == {"id": "plan-1"}
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

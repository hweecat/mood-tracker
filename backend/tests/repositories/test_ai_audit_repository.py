import sqlite3
import json

from app.repositories.ai_audit import AIAuditLogCreate, create_ai_audit_log


def test_create_ai_audit_log_persists_provider_metadata():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE ai_audit_logs (
            id TEXT PRIMARY KEY,
            correlation_id TEXT NOT NULL,
            user_id TEXT,
            entry_type TEXT,
            entry_id TEXT,
            operation TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_version_id TEXT,
            masked_request_payload TEXT,
            response_payload TEXT,
            safety_ratings TEXT,
            safety_tier TEXT,
            latency_ms INTEGER NOT NULL,
            status TEXT NOT NULL,
            error_code TEXT,
            schema_version INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );
        """
    )

    row_id = create_ai_audit_log(
        db,
        AIAuditLogCreate(
            correlation_id="corr-1",
            user_id="user-1",
            entry_type="cbt_log",
            entry_id="entry-1",
            operation="generate_reframes",
            provider="gemini",
            model="gemini-1.5-flash",
            prompt_version_id="prompt-1",
            masked_request_payload={"automatic_thought": "[MASKED]"},
            response_payload={"reframes": []},
            safety_ratings={"harassment": "LOW"},
            safety_tier="negligible",
            latency_ms=123,
            status="success",
            error_code=None,
            schema_version=1,
            created_at=1710000000,
        ),
    )

    row = db.execute("SELECT * FROM ai_audit_logs WHERE id = ?", (row_id,)).fetchone()
    assert row["provider"] == "gemini"
    assert row["model"] == "gemini-1.5-flash"
    assert row["status"] == "success"


def test_create_ai_feedback_event_persists_hitl_outcomes():
    from app.repositories.ai_audit import AIFeedbackEventCreate, create_ai_feedback_event

    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE ai_feedback_events (
            id TEXT PRIMARY KEY,
            audit_log_id TEXT,
            user_id TEXT NOT NULL,
            cbt_log_id TEXT NOT NULL,
            accepted_distortions_payload TEXT,
            ignored_distortions_payload TEXT,
            accepted_reframe_payload TEXT,
            ignored_reframes_payload TEXT,
            user_rational_response TEXT,
            accepted_action_plan_payload TEXT,
            user_action_plan TEXT,
            source TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        """
    )

    row_id = create_ai_feedback_event(
        db,
        AIFeedbackEventCreate(
            audit_log_id="audit-1",
            user_id="user-1",
            cbt_log_id="cbt-1",
            accepted_distortions_payload=[
                {"id": "distortion-1", "distortion": "catastrophizing"}
            ],
            ignored_distortions_payload=[],
            accepted_reframe_payload={
                "id": "reframe-1",
                "content": "This is hard, and I can take one small step.",
            },
            ignored_reframes_payload=[
                {"id": "reframe-2", "content": "A less useful suggestion"}
            ],
            user_rational_response="This is hard, and I can still ask for help.",
            accepted_action_plan_payload={
                "id": "plan-1",
                "steps": ["Text my study group"],
            },
            user_action_plan="Text my study group after lunch.",
            source="edited_ai",
            created_at=1710000100,
        ),
    )

    row = db.execute("SELECT * FROM ai_feedback_events WHERE id = ?", (row_id,)).fetchone()
    assert json.loads(row["accepted_distortions_payload"]) == [
        {"id": "distortion-1", "distortion": "catastrophizing"}
    ]
    assert json.loads(row["ignored_reframes_payload"]) == [
        {"id": "reframe-2", "content": "A less useful suggestion"}
    ]
    assert row["user_rational_response"] == "This is hard, and I can still ask for help."
    assert json.loads(row["accepted_action_plan_payload"]) == {
        "id": "plan-1",
        "steps": ["Text my study group"],
    }
    assert row["source"] == "edited_ai"

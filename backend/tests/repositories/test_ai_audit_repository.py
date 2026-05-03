import json
import sqlite3
from pathlib import Path

from app.repositories.ai_audit import AIAuditLogCreate, create_ai_audit_log
from app.repositories.cbt import create_cbt_log, delete_cbt_log
from app.schemas.cbt import CBTLogCreate


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


def test_delete_cbt_log_removes_feedback_event_with_user_owned_text():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE cbt_logs (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            situation TEXT NOT NULL,
            automatic_thoughts TEXT NOT NULL,
            distortions TEXT NOT NULL,
            rational_response TEXT NOT NULL,
            mood_before INTEGER NOT NULL,
            mood_after INTEGER,
            behavioral_link TEXT,
            action_plan_status TEXT NOT NULL DEFAULT 'pending',
            user_id TEXT NOT NULL
        );
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
    db.execute(
        """
        INSERT INTO cbt_logs (
            id, timestamp, situation, automatic_thoughts, distortions,
            rational_response, mood_before, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "cbt-private",
            1710000200,
            "private situation",
            "private thought",
            "[]",
            "private rational response",
            3,
            "user-1",
        ),
    )
    db.execute(
        """
        INSERT INTO ai_feedback_events (
            id, user_id, cbt_log_id, user_rational_response, user_action_plan, source, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "feedback-private",
            "user-1",
            "cbt-private",
            "Raw private rational response",
            "Raw private action plan",
            "edited_ai",
            1710000300,
        ),
    )
    db.commit()

    assert delete_cbt_log(db, user_id="user-1", log_id="cbt-private") is True

    row = db.execute(
        "SELECT * FROM ai_feedback_events WHERE cbt_log_id = ?",
        ("cbt-private",),
    ).fetchone()
    assert row is None


def test_create_cbt_log_only_links_feedback_to_same_user_audit_id():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    _create_cbt_feedback_test_schema(db)
    _insert_audit_log(db, audit_id="audit-same-user", user_id="user-1")
    _insert_audit_log(db, audit_id="audit-other-user", user_id="user-2")

    create_cbt_log(
        db,
        user_id="user-1",
        log_in=_cbt_log_create(
            log_id="cbt-valid-audit",
            ai_analysis_id="audit-same-user",
        ),
    )
    create_cbt_log(
        db,
        user_id="user-1",
        log_in=_cbt_log_create(
            log_id="cbt-cross-user-audit",
            ai_analysis_id="audit-other-user",
        ),
    )
    create_cbt_log(
        db,
        user_id="user-1",
        log_in=_cbt_log_create(
            log_id="cbt-orphan-audit",
            ai_analysis_id="audit-missing",
        ),
    )

    rows = {
        row["cbt_log_id"]: row["audit_log_id"]
        for row in db.execute(
            "SELECT cbt_log_id, audit_log_id FROM ai_feedback_events"
        ).fetchall()
    }
    assert rows == {
        "cbt-valid-audit": "audit-same-user",
        "cbt-cross-user-audit": None,
        "cbt-orphan-audit": None,
    }


def test_create_cbt_log_prefers_full_feedback_payloads_when_provided():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    _create_cbt_feedback_test_schema(db)
    _insert_audit_log(db, audit_id="audit-payloads", user_id="user-1")

    create_cbt_log(
        db,
        user_id="user-1",
        log_in=CBTLogCreate(
            id="cbt-payloads",
            timestamp=1710000200,
            situation="I missed a deadline",
            automatic_thoughts="I always fail",
            distortions=["All-or-Nothing Thinking"],
            rational_response="I missed one deadline, and I can recover.",
            mood_before=3,
            mood_after=6,
            behavioral_link="Email my teacher",
            ai_analysis_id="audit-payloads",
            accepted_distortions_payload=[
                {
                    "distortion": "All-or-Nothing Thinking",
                    "reasoning": "Uses all-or-nothing language.",
                    "confidence": 0.91,
                }
            ],
            ignored_distortions_payload=[
                {
                    "distortion": "Catastrophizing",
                    "reasoning": "Assumes the worst outcome.",
                    "confidence": 0.66,
                }
            ],
            accepted_reframe_payload={
                "id": "reframe-1",
                "perspective": "Compassionate",
                "content": "One missed deadline can be repaired.",
            },
            ignored_reframes_payload=[
                {
                    "id": "reframe-2",
                    "perspective": "Logical",
                    "content": "The deadline is only one data point.",
                }
            ],
            accepted_action_plan_payload={
                "id": "plan-1",
                "steps": ["Email my teacher", "Ask for a revised deadline"],
            },
            feedback_source="edited_ai",
        ),
    )

    row = db.execute(
        "SELECT * FROM ai_feedback_events WHERE cbt_log_id = ?",
        ("cbt-payloads",),
    ).fetchone()
    assert json.loads(row["accepted_distortions_payload"]) == [
        {
            "distortion": "All-or-Nothing Thinking",
            "reasoning": "Uses all-or-nothing language.",
            "confidence": 0.91,
        }
    ]
    assert json.loads(row["ignored_distortions_payload"]) == [
        {
            "distortion": "Catastrophizing",
            "reasoning": "Assumes the worst outcome.",
            "confidence": 0.66,
        }
    ]
    assert json.loads(row["accepted_reframe_payload"]) == {
        "id": "reframe-1",
        "perspective": "Compassionate",
        "content": "One missed deadline can be repaired.",
    }
    assert json.loads(row["ignored_reframes_payload"]) == [
        {
            "id": "reframe-2",
            "perspective": "Logical",
            "content": "The deadline is only one data point.",
        }
    ]
    assert json.loads(row["accepted_action_plan_payload"]) == {
        "id": "plan-1",
        "steps": ["Email my teacher", "Ask for a revised deadline"],
    }
    assert row["user_rational_response"] == "I missed one deadline, and I can recover."
    assert row["user_action_plan"] == "Email my teacher"


def test_sqitch_migrations_create_canonical_ai_audit_tables():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    repo_root = Path(__file__).resolve().parents[3]
    migrations = repo_root / "migrations" / "deploy"

    for migration_name in [
        "appschema.sql",
        "add_ai_audit_logs_table.sql",
        "align_ai_audit_feedback_schema.sql",
    ]:
        db.executescript((migrations / migration_name).read_text())

    assert _table_columns(db, "ai_audit_logs") == [
        "id",
        "correlation_id",
        "user_id",
        "entry_type",
        "entry_id",
        "operation",
        "provider",
        "model",
        "prompt_version_id",
        "masked_request_payload",
        "response_payload",
        "safety_ratings",
        "safety_tier",
        "latency_ms",
        "status",
        "error_code",
        "schema_version",
        "created_at",
    ]
    assert _table_columns(db, "ai_feedback_events") == [
        "id",
        "audit_log_id",
        "user_id",
        "cbt_log_id",
        "accepted_distortions_payload",
        "ignored_distortions_payload",
        "accepted_reframe_payload",
        "ignored_reframes_payload",
        "user_rational_response",
        "accepted_action_plan_payload",
        "user_action_plan",
        "source",
        "created_at",
    ]


def test_init_db_creates_canonical_ai_audit_tables(tmp_path, monkeypatch):
    from app.db import session

    db_path = tmp_path / "data" / "mood-tracker.db"
    monkeypatch.setattr(session, "DATABASE_PATH", str(db_path))

    session.init_db()

    db = sqlite3.connect(db_path)
    try:
        assert "provider" in _table_columns(db, "ai_audit_logs")
        assert "model" in _table_columns(db, "ai_audit_logs")
        assert "masked_request_payload" in _table_columns(db, "ai_audit_logs")
        assert "user_rational_response" in _table_columns(db, "ai_feedback_events")
        assert "accepted_action_plan_payload" in _table_columns(db, "ai_feedback_events")
    finally:
        db.close()


def _table_columns(db: sqlite3.Connection, table_name: str) -> list[str]:
    rows = db.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in rows]


def _create_cbt_feedback_test_schema(db: sqlite3.Connection) -> None:
    db.executescript(
        """
        CREATE TABLE cbt_logs (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            situation TEXT NOT NULL,
            automatic_thoughts TEXT NOT NULL,
            distortions TEXT NOT NULL,
            rational_response TEXT NOT NULL,
            mood_before INTEGER NOT NULL,
            mood_after INTEGER,
            behavioral_link TEXT,
            action_plan_status TEXT NOT NULL DEFAULT 'pending',
            user_id TEXT NOT NULL
        );
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


def _insert_audit_log(db: sqlite3.Connection, audit_id: str, user_id: str) -> None:
    db.execute(
        """
        INSERT INTO ai_audit_logs (
            id, correlation_id, user_id, operation, provider, model,
            latency_ms, status, schema_version, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            audit_id,
            f"corr-{audit_id}",
            user_id,
            "analyze_cbt",
            "gemini",
            "gemini-1.5-flash",
            10,
            "success",
            1,
            1710000100,
        ),
    )
    db.commit()


def _cbt_log_create(log_id: str, ai_analysis_id: str) -> CBTLogCreate:
    return CBTLogCreate(
        id=log_id,
        timestamp=1710000200,
        situation="I missed a deadline",
        automatic_thoughts="I always fail",
        distortions=["All-or-Nothing Thinking"],
        rational_response="I missed one deadline, and I can recover.",
        mood_before=3,
        mood_after=6,
        behavioral_link="Email my teacher",
        ai_analysis_id=ai_analysis_id,
        feedback_source="edited_ai",
    )

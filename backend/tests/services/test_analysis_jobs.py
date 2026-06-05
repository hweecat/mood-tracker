import json
import sqlite3

from app.repositories.analysis import create_analysis_job, get_analysis_job
from app.services import analysis_jobs


def test_run_analysis_job_marks_job_running_before_analysis(tmp_path, monkeypatch):
    db_path = tmp_path / "data" / "mood-tracker.db"
    db_path.parent.mkdir()
    request_db = sqlite3.connect(db_path)
    request_db.row_factory = sqlite3.Row
    _create_schema(request_db)
    request_db.execute(
        """
        INSERT INTO mood_entries (
            id, rating, emotions, note, timestamp, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        ("mood-running-1", 3, '["tired"]', "I feel worn down", 1710000000, "user-1"),
    )
    job_id = create_analysis_job(
        request_db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-running-1",
        analysis_type="mood_enrichment",
    )
    request_db.close()
    observed_statuses = []

    def capture_running_status(db, job):
        observed_statuses.append(
            db.execute(
                "SELECT status FROM analysis_jobs WHERE id = ?",
                (job["id"],),
            ).fetchone()["status"]
        )
        return {"summary": "running status observed"}

    monkeypatch.setattr(analysis_jobs, "analyze_mood_entry", capture_running_status)

    analysis_jobs.run_analysis_job(job_id, database_path=str(db_path))

    assert observed_statuses == ["running"]


def test_run_analysis_job_uses_fresh_connection_after_source_commit(tmp_path):
    db_path = tmp_path / "data" / "mood-tracker.db"
    db_path.parent.mkdir()
    request_db = sqlite3.connect(db_path)
    request_db.row_factory = sqlite3.Row
    _create_schema(request_db)
    request_db.execute(
        """
        INSERT INTO mood_entries (
            id, rating, emotions, note, timestamp, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        ("mood-1", 2, '["sad"]', "I feel low", 1710000000, "user-1"),
    )
    job_id = create_analysis_job(
        request_db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-1",
        analysis_type="mood_enrichment",
    )
    request_db.close()

    analysis_jobs.run_analysis_job(job_id, database_path=str(db_path))

    verification_db = sqlite3.connect(db_path)
    verification_db.row_factory = sqlite3.Row
    try:
        row = get_analysis_job(verification_db, user_id="user-1", job_id=job_id)
    finally:
        verification_db.close()
    assert row["status"] == "succeeded"
    assert "mood" in row["result_payload"]


def test_run_mood_analysis_persists_completed_result_on_mood_entry(tmp_path):
    db_path = tmp_path / "data" / "mood-tracker.db"
    db_path.parent.mkdir()
    request_db = sqlite3.connect(db_path)
    request_db.row_factory = sqlite3.Row
    _create_schema(request_db)
    request_db.execute(
        """
        INSERT INTO mood_entries (
            id, rating, emotions, note, timestamp, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "mood-visible-1",
            2,
            '["sad"]',
            "My email is jane@example.com and I feel low",
            1710000000,
            "user-1",
        ),
    )
    job_id = create_analysis_job(
        request_db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-visible-1",
        analysis_type="mood_enrichment",
    )
    request_db.close()

    analysis_jobs.run_analysis_job(job_id, database_path=str(db_path))

    verification_db = sqlite3.connect(db_path)
    verification_db.row_factory = sqlite3.Row
    try:
        row = verification_db.execute(
            "SELECT ai_analysis FROM mood_entries WHERE id = ?",
            ("mood-visible-1",),
        ).fetchone()
    finally:
        verification_db.close()
    payload = json.loads(row["ai_analysis"])
    payload_text = json.dumps(payload)
    assert payload["mood"] == {
        "emotion_count": 1,
        "has_behavior": False,
        "has_note": True,
        "has_trigger": False,
        "rating": 2,
    }
    assert "jane@example.com" not in payload_text
    assert "I feel low" not in payload_text


def test_run_analysis_job_failure_does_not_remove_source_entry(tmp_path):
    db_path = tmp_path / "data" / "mood-tracker.db"
    db_path.parent.mkdir()
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    _create_schema(db)
    db.execute(
        """
        INSERT INTO cbt_logs (
            id, timestamp, situation, automatic_thoughts, distortions,
            rational_response, mood_before, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "cbt-1",
            1710000000,
            "A hard moment",
            "I cannot do this",
            '["Catastrophizing"]',
            "I can take one step.",
            2,
            "user-1",
        ),
    )
    job_id = create_analysis_job(
        db,
        user_id="user-1",
        entry_type="cbt_log",
        entry_id="cbt-1",
        analysis_type="unsupported_analysis",
    )
    db.close()

    analysis_jobs.run_analysis_job(job_id, database_path=str(db_path))

    verification_db = sqlite3.connect(db_path)
    verification_db.row_factory = sqlite3.Row
    try:
        job = get_analysis_job(verification_db, user_id="user-1", job_id=job_id)
        source = verification_db.execute(
            "SELECT id FROM cbt_logs WHERE id = ?",
            ("cbt-1",),
        ).fetchone()
    finally:
        verification_db.close()
    assert job["status"] == "failed"
    assert job["error_code"] == "analysis_failed"
    assert source is not None


def _create_schema(db: sqlite3.Connection) -> None:
    db.executescript(
        """
        CREATE TABLE mood_entries (
            id TEXT PRIMARY KEY,
            rating INTEGER NOT NULL,
            emotions TEXT NOT NULL,
            note TEXT,
            timestamp INTEGER NOT NULL,
            trigger TEXT,
            behavior TEXT,
            user_id TEXT NOT NULL,
            ai_analysis TEXT
        );
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
        CREATE TABLE analysis_jobs (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            entry_type TEXT NOT NULL,
            entry_id TEXT NOT NULL,
            analysis_type TEXT NOT NULL,
            status TEXT NOT NULL,
            result_payload TEXT,
            error_code TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        """
    )
    db.commit()

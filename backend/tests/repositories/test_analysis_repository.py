import json
import sqlite3
from pathlib import Path

from app.repositories.analysis import (
    create_analysis_job,
    get_analysis_job,
    list_analysis_jobs,
    mark_analysis_job_failed,
    mark_analysis_job_succeeded,
)


def test_analysis_job_lifecycle_persists_status_and_result():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    _create_analysis_jobs_table(db)

    job_id = create_analysis_job(
        db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-1",
        analysis_type="mood_enrichment",
    )
    mark_analysis_job_succeeded(
        db,
        job_id,
        {"summary": "negative sentiment trend"},
    )

    row = db.execute(
        "SELECT status, result_payload FROM analysis_jobs WHERE id = ?",
        (job_id,),
    ).fetchone()
    assert row["status"] == "succeeded"
    assert json.loads(row["result_payload"]) == {"summary": "negative sentiment trend"}


def test_failed_analysis_persists_compact_error_without_result():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    _create_analysis_jobs_table(db)

    job_id = create_analysis_job(
        db,
        user_id="user-1",
        entry_type="cbt_log",
        entry_id="cbt-1",
        analysis_type="longitudinal_cbt",
    )
    mark_analysis_job_failed(db, job_id, "analysis_unavailable")

    row = get_analysis_job(db, user_id="user-1", job_id=job_id)
    assert row["status"] == "failed"
    assert row["error_code"] == "analysis_unavailable"
    assert row["result_payload"] is None


def test_list_analysis_jobs_scopes_by_user_and_entry():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    _create_analysis_jobs_table(db)
    matching_job_id = create_analysis_job(
        db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-1",
        analysis_type="mood_enrichment",
    )
    create_analysis_job(
        db,
        user_id="user-2",
        entry_type="mood_entry",
        entry_id="mood-1",
        analysis_type="mood_enrichment",
    )
    create_analysis_job(
        db,
        user_id="user-1",
        entry_type="cbt_log",
        entry_id="cbt-1",
        analysis_type="longitudinal_cbt",
    )

    rows = list_analysis_jobs(
        db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-1",
    )

    assert [row["id"] for row in rows] == [matching_job_id]


def test_sqitch_migration_creates_analysis_jobs_with_lookup_indexes():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    repo_root = Path(__file__).resolve().parents[3]

    db.executescript(
        (repo_root / "migrations" / "deploy" / "add_analysis_jobs.sql").read_text()
    )

    assert _table_columns(db, "analysis_jobs") == [
        "id",
        "user_id",
        "entry_type",
        "entry_id",
        "analysis_type",
        "status",
        "result_payload",
        "error_code",
        "created_at",
        "updated_at",
    ]
    indexes = _index_names(db, "analysis_jobs")
    assert "idx_analysis_jobs_user_entry_created_at" in indexes
    assert "idx_analysis_jobs_created_at" in indexes


def test_init_db_creates_analysis_jobs_table(tmp_path, monkeypatch):
    from app.db import session

    db_path = tmp_path / "data" / "mood-tracker.db"
    monkeypatch.setattr(session, "DATABASE_PATH", str(db_path))

    session.init_db()

    db = sqlite3.connect(db_path)
    try:
        assert "analysis_jobs" in _table_names(db)
        assert "result_payload" in _table_columns(db, "analysis_jobs")
    finally:
        db.close()


def _create_analysis_jobs_table(db: sqlite3.Connection) -> None:
    db.executescript(
        """
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


def _table_columns(db: sqlite3.Connection, table_name: str) -> list[str]:
    rows = db.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in rows]


def _table_names(db: sqlite3.Connection) -> set[str]:
    rows = db.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
    return {row[0] for row in rows}


def _index_names(db: sqlite3.Connection, table_name: str) -> set[str]:
    rows = db.execute(f"PRAGMA index_list({table_name})").fetchall()
    return {row["name"] if isinstance(row, sqlite3.Row) else row[1] for row in rows}

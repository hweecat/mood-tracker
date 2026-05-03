import json
import sqlite3
from pathlib import Path

import pytest

from app.repositories.analysis import (
    create_analysis_job,
    delete_analysis_jobs_for_entry,
    get_analysis_job,
    list_analysis_jobs,
    mark_analysis_job_failed,
    mark_analysis_job_running,
    mark_analysis_job_succeeded,
)


def test_create_analysis_job_queues_job_and_supports_running_transition():
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

    queued = get_analysis_job(db, user_id="user-1", job_id=job_id)
    assert queued["status"] == "queued"

    mark_analysis_job_running(db, job_id)

    running = get_analysis_job(db, user_id="user-1", job_id=job_id)
    assert running["status"] == "running"


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


def test_delete_analysis_jobs_for_entry_removes_only_matching_user_entry_rows():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    _create_analysis_jobs_table(db)
    deleted_job_id = create_analysis_job(
        db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-1",
        analysis_type="mood_enrichment",
    )
    preserved_other_user_id = create_analysis_job(
        db,
        user_id="user-2",
        entry_type="mood_entry",
        entry_id="mood-1",
        analysis_type="mood_enrichment",
    )
    preserved_other_entry_id = create_analysis_job(
        db,
        user_id="user-1",
        entry_type="cbt_log",
        entry_id="cbt-1",
        analysis_type="longitudinal_cbt",
    )

    deleted_count = delete_analysis_jobs_for_entry(
        db,
        user_id="user-1",
        entry_type="mood_entry",
        entry_id="mood-1",
    )

    assert deleted_count == 1
    assert get_analysis_job(db, user_id="user-1", job_id=deleted_job_id) is None
    assert get_analysis_job(db, user_id="user-2", job_id=preserved_other_user_id)
    assert get_analysis_job(db, user_id="user-1", job_id=preserved_other_entry_id)


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


def test_sqitch_migration_rejects_invalid_analysis_job_contract_values():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    repo_root = Path(__file__).resolve().parents[3]
    db.executescript(
        (repo_root / "migrations" / "deploy" / "add_analysis_jobs.sql").read_text()
    )

    with pytest.raises(sqlite3.IntegrityError):
        db.execute(
            """
            INSERT INTO analysis_jobs (
                id, user_id, entry_type, entry_id, analysis_type, status,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "bad-status",
                "user-1",
                "mood_entry",
                "mood-1",
                "mood_enrichment",
                "pending",
                1710000000,
                1710000000,
            ),
        )

    with pytest.raises(sqlite3.IntegrityError):
        db.execute(
            """
            INSERT INTO analysis_jobs (
                id, user_id, entry_type, entry_id, analysis_type, status,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "bad-entry-type",
                "user-1",
                "journal_note",
                "note-1",
                "mood_enrichment",
                "queued",
                1710000000,
                1710000000,
            ),
        )

    with pytest.raises(sqlite3.IntegrityError):
        db.execute(
            """
            INSERT INTO analysis_jobs (
                id, user_id, entry_type, entry_id, analysis_type, status,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "bad-analysis-type",
                "user-1",
                "mood_entry",
                "mood-1",
                "unsupported_analysis",
                "queued",
                1710000000,
                1710000000,
            ),
        )


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

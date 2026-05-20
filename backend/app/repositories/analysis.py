import json
import time
import uuid
from sqlite3 import Connection, Row
from typing import Any


def create_analysis_job(
    db: Connection,
    user_id: str,
    entry_type: str,
    entry_id: str,
    analysis_type: str,
) -> str:
    active_job = db.execute(
        """
        SELECT id FROM analysis_jobs
        WHERE user_id = ?
          AND entry_type = ?
          AND entry_id = ?
          AND analysis_type = ?
          AND status IN ('queued', 'running')
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (user_id, entry_type, entry_id, analysis_type),
    ).fetchone()
    if active_job is not None:
        return active_job["id"]

    now = int(time.time())
    job_id = str(uuid.uuid4())
    db.execute(
        """
        INSERT INTO analysis_jobs (
            id, user_id, entry_type, entry_id, analysis_type, status,
            result_payload, error_code, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            job_id,
            user_id,
            entry_type,
            entry_id,
            analysis_type,
            "queued",
            None,
            None,
            now,
            now,
        ),
    )
    db.commit()
    return job_id


def get_analysis_job(db: Connection, user_id: str, job_id: str) -> Row | None:
    return db.execute(
        "SELECT * FROM analysis_jobs WHERE id = ? AND user_id = ?",
        (job_id, user_id),
    ).fetchone()


def get_analysis_job_by_id(db: Connection, job_id: str) -> Row | None:
    return db.execute(
        "SELECT * FROM analysis_jobs WHERE id = ?",
        (job_id,),
    ).fetchone()


def list_analysis_jobs(
    db: Connection,
    user_id: str,
    entry_type: str | None = None,
    entry_id: str | None = None,
) -> list[Row]:
    clauses = ["user_id = ?"]
    params: list[Any] = [user_id]
    if entry_type:
        clauses.append("entry_type = ?")
        params.append(entry_type)
    if entry_id:
        clauses.append("entry_id = ?")
        params.append(entry_id)

    return db.execute(
        f"""
        SELECT * FROM analysis_jobs
        WHERE {' AND '.join(clauses)}
        ORDER BY created_at DESC
        """,
        params,
    ).fetchall()


def mark_analysis_job_running(db: Connection, job_id: str) -> None:
    db.execute(
        """
        UPDATE analysis_jobs
        SET status = ?, updated_at = ?
        WHERE id = ?
        """,
        ("running", int(time.time()), job_id),
    )
    db.commit()


def mark_analysis_job_succeeded(
    db: Connection,
    job_id: str,
    result_payload: dict[str, Any],
) -> None:
    compact_payload = compact_analysis_payload(result_payload)
    serialized_payload = json.dumps(compact_payload, sort_keys=True)
    db.execute(
        """
        UPDATE analysis_jobs
        SET status = ?, result_payload = ?, error_code = NULL, updated_at = ?
        WHERE id = ?
        """,
        (
            "succeeded",
            serialized_payload,
            int(time.time()),
            job_id,
        ),
    )
    _persist_completed_mood_analysis(db, job_id, serialized_payload)
    db.commit()


def delete_analysis_jobs_for_entry(
    db: Connection,
    user_id: str,
    entry_type: str,
    entry_id: str,
) -> int:
    if not _table_exists(db, "analysis_jobs"):
        return 0

    cursor = db.execute(
        """
        DELETE FROM analysis_jobs
        WHERE user_id = ? AND entry_type = ? AND entry_id = ?
        """,
        (user_id, entry_type, entry_id),
    )
    db.commit()
    return cursor.rowcount


def mark_analysis_job_failed(
    db: Connection,
    job_id: str,
    error_code: str,
) -> None:
    db.execute(
        """
        UPDATE analysis_jobs
        SET status = ?, result_payload = NULL, error_code = ?, updated_at = ?
        WHERE id = ?
        """,
        ("failed", error_code, int(time.time()), job_id),
    )
    db.commit()


def _table_exists(db: Connection, table_name: str) -> bool:
    row = db.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def compact_analysis_payload(payload: Any) -> Any:
    if isinstance(payload, dict):
        return {
            key: compact_analysis_payload(value)
            for key, value in payload.items()
            if key not in _RAW_SOURCE_FIELD_KEYS
        }
    if isinstance(payload, list):
        return [compact_analysis_payload(item) for item in payload]
    return payload


def _persist_completed_mood_analysis(
    db: Connection,
    job_id: str,
    serialized_payload: str,
) -> None:
    if not _table_exists(db, "mood_entries") or not _column_exists(
        db,
        "mood_entries",
        "ai_analysis",
    ):
        return

    db.execute(
        """
        UPDATE mood_entries
        SET ai_analysis = ?
        WHERE id = (
            SELECT entry_id FROM analysis_jobs
            WHERE id = ?
              AND entry_type = 'mood_entry'
              AND analysis_type = 'mood_enrichment'
        )
        AND user_id = (
            SELECT user_id FROM analysis_jobs
            WHERE id = ?
              AND entry_type = 'mood_entry'
              AND analysis_type = 'mood_enrichment'
        )
        """,
        (serialized_payload, job_id, job_id),
    )


def _column_exists(db: Connection, table_name: str, column_name: str) -> bool:
    rows = db.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(
        (row["name"] if isinstance(row, Row) else row[1]) == column_name
        for row in rows
    )


_RAW_SOURCE_FIELD_KEYS = {
    "note",
    "trigger",
    "behavior",
    "situation",
    "automatic_thought",
    "automatic_thoughts",
    "rational_response",
    "behavioral_link",
    "user_rational_response",
    "user_action_plan",
}

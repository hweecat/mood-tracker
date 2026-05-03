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
    db.execute(
        """
        UPDATE analysis_jobs
        SET status = ?, result_payload = ?, error_code = NULL, updated_at = ?
        WHERE id = ?
        """,
        (
            "succeeded",
            json.dumps(result_payload, sort_keys=True),
            int(time.time()),
            job_id,
        ),
    )
    db.commit()


def delete_analysis_jobs_for_entry(
    db: Connection,
    user_id: str,
    entry_type: str,
    entry_id: str,
) -> int:
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

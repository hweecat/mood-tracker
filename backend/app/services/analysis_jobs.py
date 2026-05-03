import sqlite3

from app.db import session
from app.repositories.analysis import (
    get_analysis_job_by_id,
    mark_analysis_job_failed,
    mark_analysis_job_running,
    mark_analysis_job_succeeded,
)
from app.services.journal_analysis import analyze_cbt_log, analyze_mood_entry


def run_analysis_job(job_id: str, database_path: str | None = None) -> None:
    db_path = database_path or session.DATABASE_PATH
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    try:
        job = get_analysis_job_by_id(db, job_id)
        if job is None:
            return

        try:
            mark_analysis_job_running(db, job_id)
            if job["analysis_type"] == "mood_enrichment":
                result = analyze_mood_entry(db, job)
            elif job["analysis_type"] == "longitudinal_cbt":
                result = analyze_cbt_log(db, job)
            else:
                raise ValueError("unsupported_analysis_type")
            mark_analysis_job_succeeded(db, job_id, result)
        except Exception:
            mark_analysis_job_failed(db, job_id, "analysis_failed")
    finally:
        db.close()

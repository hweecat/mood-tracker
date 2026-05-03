import sqlite3

from fastapi.testclient import TestClient

from app.api.v1.routes import cbt_logs, moods
from app.db import session
from app.main import app
from app.services import analysis_jobs


def test_mood_post_commits_entry_and_schedules_analysis_without_inline_inference(
    tmp_path,
    monkeypatch,
):
    db_path = _init_test_db(tmp_path, monkeypatch)
    scheduled = []

    def forbidden_inline_analysis(note: str):
        raise AssertionError("mood POST must not run inline model inference")

    def capture_task(self, task, *args, **kwargs):
        scheduled.append((task, args, kwargs))
        db = sqlite3.connect(db_path)
        try:
            row = db.execute(
                "SELECT id FROM mood_entries WHERE id = ?",
                ("mood-async-1",),
            ).fetchone()
            job = db.execute(
                """
                SELECT status FROM analysis_jobs
                WHERE entry_type = ? AND entry_id = ?
                """,
                ("mood_entry", "mood-async-1"),
            ).fetchone()
        finally:
            db.close()
        assert row is not None
        assert job[0] == "pending"

    monkeypatch.setattr(moods, "analyze_mood_note", forbidden_inline_analysis, raising=False)
    monkeypatch.setattr(moods.BackgroundTasks, "add_task", capture_task)

    app.dependency_overrides[moods.get_db] = _db_override(db_path)
    try:
        response = TestClient(app).post(
            "/api/v1/moods/",
            json={
                "id": "mood-async-1",
                "rating": 2,
                "emotions": ["sad"],
                "note": "I feel low",
                "timestamp": 1710000000,
            },
        )
    finally:
        app.dependency_overrides.pop(moods.get_db, None)

    assert response.status_code == 200
    assert response.json()["aiAnalysis"] is None
    assert len(scheduled) == 1
    assert scheduled[0][0] is analysis_jobs.run_analysis_job


def test_cbt_post_commits_entry_and_schedules_longitudinal_analysis(
    tmp_path,
    monkeypatch,
):
    db_path = _init_test_db(tmp_path, monkeypatch)
    scheduled = []

    def capture_task(self, task, *args, **kwargs):
        scheduled.append((task, args, kwargs))
        db = sqlite3.connect(db_path)
        try:
            row = db.execute(
                "SELECT id FROM cbt_logs WHERE id = ?",
                ("cbt-async-1",),
            ).fetchone()
            job = db.execute(
                """
                SELECT analysis_type, status FROM analysis_jobs
                WHERE entry_type = ? AND entry_id = ?
                """,
                ("cbt_log", "cbt-async-1"),
            ).fetchone()
        finally:
            db.close()
        assert row is not None
        assert job == ("longitudinal_cbt", "pending")

    monkeypatch.setattr(cbt_logs.BackgroundTasks, "add_task", capture_task)

    app.dependency_overrides[cbt_logs.get_db] = _db_override(db_path)
    try:
        response = TestClient(app).post(
            "/api/v1/cbt-logs/",
            json={
                "id": "cbt-async-1",
                "timestamp": 1710000200,
                "situation": "I missed a deadline",
                "automaticThoughts": "I always fail",
                "distortions": ["All-or-Nothing Thinking"],
                "rationalResponse": "I missed one deadline, and I can recover.",
                "moodBefore": 3,
                "moodAfter": 6,
            },
        )
    finally:
        app.dependency_overrides.pop(cbt_logs.get_db, None)

    assert response.status_code == 200
    assert len(scheduled) == 1
    assert scheduled[0][0] is analysis_jobs.run_analysis_job


def test_analysis_retrieval_is_scoped_to_current_user(tmp_path, monkeypatch):
    db_path = _init_test_db(tmp_path, monkeypatch)
    db = sqlite3.connect(db_path)
    try:
        db.execute(
            """
            INSERT INTO analysis_jobs (
                id, user_id, entry_type, entry_id, analysis_type, status,
                result_payload, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "analysis-user-1",
                "1",
                "mood_entry",
                "mood-1",
                "mood_enrichment",
                "succeeded",
                '{"summary": "mine"}',
                1710000000,
                1710000000,
            ),
        )
        db.execute(
            """
            INSERT INTO analysis_jobs (
                id, user_id, entry_type, entry_id, analysis_type, status,
                result_payload, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "analysis-user-2",
                "other-user",
                "mood_entry",
                "mood-1",
                "mood_enrichment",
                "succeeded",
                '{"summary": "not mine"}',
                1710000001,
                1710000001,
            ),
        )
        db.commit()
    finally:
        db.close()

    response = TestClient(app).get(
        "/api/v1/analyses/",
        params={"entryType": "mood_entry", "entryId": "mood-1"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload] == ["analysis-user-1"]
    assert payload[0]["resultPayload"] == {"summary": "mine"}


def _init_test_db(tmp_path, monkeypatch):
    db_path = tmp_path / "data" / "mood-tracker.db"
    monkeypatch.setattr(session, "DATABASE_PATH", str(db_path))
    session.init_db()
    return db_path


def _db_override(db_path):
    def override_get_db():
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    return override_get_db

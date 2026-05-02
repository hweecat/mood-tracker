import os
import sqlite3
import time

import pytest
from fastapi.testclient import TestClient

from app.core.security import get_password_hash
from app.db.session import get_db
from app.main import app
from app.api.v1.routes import auth as auth_routes


@pytest.fixture
def db_conn():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row

    conn.executescript(
        """
        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            name TEXT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            password_reset_token_hash TEXT,
            password_reset_expires_at INTEGER,
            password_reset_requested_at INTEGER,
            image TEXT,
            created_at INTEGER
        );
        """
    )

    # Seed a user
    conn.execute(
        """
        INSERT INTO users (id, username, name, email, password_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            "u1",
            "alice",
            "Alice",
            "alice@example.com",
            get_password_hash("oldpassword"),
            int(time.time()),
        ),
    )
    conn.commit()
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture
def client(db_conn):
    def override_get_db():
        try:
            yield db_conn
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_forgot_password_returns_generic_message_for_unknown_and_known(client, monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_DEBUG", "false")

    known = client.post("/api/v1/auth/forgot-password", json={"identifier": "alice"})
    unknown = client.post("/api/v1/auth/forgot-password", json={"identifier": "does-not-exist"})

    assert known.status_code == 200
    assert unknown.status_code == 200
    assert known.json().get("message") == unknown.json().get("message")


def test_forgot_password_debug_returns_token_and_url(client, monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_DEBUG", "true")
    monkeypatch.setenv("SMTP_ENABLED", "false")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")

    res = client.post("/api/v1/auth/forgot-password", json={"identifier": "alice"})
    assert res.status_code == 200
    body = res.json()
    token = body.get("reset_token") or body.get("resetToken")
    url = body.get("reset_url") or body.get("resetUrl")
    assert token
    assert url
    assert url.startswith("http://localhost:3000/reset-password?token=")


def test_reset_password_happy_path_changes_password(client, monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_DEBUG", "true")
    monkeypatch.setenv("SMTP_ENABLED", "false")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")

    forgot = client.post("/api/v1/auth/forgot-password", json={"identifier": "alice"})
    forgot_body = forgot.json()
    token = forgot_body.get("reset_token") or forgot_body.get("resetToken")
    assert token

    reset = client.post("/api/v1/auth/reset-password", json={"token": token, "newPassword": "newpassword"})
    assert reset.status_code == 200

    # Login should work with new password and fail with old password
    old_login = client.post("/api/v1/auth/login", json={"username": "alice", "password": "oldpassword"})
    assert old_login.status_code == 401

    new_login = client.post("/api/v1/auth/login", json={"username": "alice", "password": "newpassword"})
    assert new_login.status_code == 200


def test_reset_password_token_is_one_time_use(client, monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_DEBUG", "true")
    monkeypatch.setenv("SMTP_ENABLED", "false")

    forgot = client.post("/api/v1/auth/forgot-password", json={"identifier": "alice"})
    forgot_body = forgot.json()
    token = forgot_body.get("reset_token") or forgot_body.get("resetToken")
    assert token

    first = client.post("/api/v1/auth/reset-password", json={"token": token, "newPassword": "newpassword"})
    assert first.status_code == 200

    second = client.post("/api/v1/auth/reset-password", json={"token": token, "newPassword": "anotherpassword"})
    assert second.status_code == 400


def test_forgot_password_sends_email_without_returning_reset_url(client, monkeypatch):
    sent = {}

    def fake_send_password_reset_email(*, recipient_email: str, recipient_name: str | None, reset_url: str) -> None:
        sent["recipient_email"] = recipient_email
        sent["recipient_name"] = recipient_name
        sent["reset_url"] = reset_url

    monkeypatch.setenv("PASSWORD_RESET_DEBUG", "false")
    monkeypatch.setenv("SMTP_ENABLED", "true")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")
    monkeypatch.setattr(auth_routes, "send_password_reset_email", fake_send_password_reset_email)

    res = client.post("/api/v1/auth/forgot-password", json={"identifier": "alice"})

    assert res.status_code == 200
    body = res.json()
    assert body["message"] == "If an account exists for that identifier, we have sent password reset instructions."
    assert (body.get("reset_url") or body.get("resetUrl")) is None
    assert (body.get("reset_token") or body.get("resetToken")) is None
    assert sent["recipient_email"] == "alice@example.com"
    assert sent["recipient_name"] == "Alice"
    assert sent["reset_url"].startswith("http://localhost:3000/reset-password?token=")

import uuid
import time
from typing import Optional
from sqlite3 import Connection
from app.schemas.user import UserCreate
from app.core.security import get_password_hash
from app.core.logging import get_logger

logger = get_logger(__name__)

def get_user_by_email(db: Connection, email: str) -> Optional[dict]:
    logger.info("Fetching user by email", extra={"email": email})
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    return dict(row) if row else None

def get_user_by_username(db: Connection, username: str) -> Optional[dict]:
    logger.info("Fetching user by username", extra={"username": username})
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    return dict(row) if row else None

def get_user_by_id(db: Connection, user_id: str) -> Optional[dict]:
    logger.info("Fetching user by id", extra={"user_id": user_id})
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    return dict(row) if row else None

def get_user_by_identifier(db: Connection, identifier: str) -> Optional[dict]:
    logger.info("Fetching user by identifier", extra={"identifier": identifier})
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ? OR id = ? OR username = ?", (identifier, identifier, identifier))
    row = cursor.fetchone()
    return dict(row) if row else None

def create_user(db: Connection, user_in: UserCreate) -> dict:
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_in.password)
    created_at = int(time.time())
    
    # Use provided username or generate a unique one if not provided (optional logic)
    # For now, we assume username is optional in input but required in DB if we enforced it.
    # Since schema has optional username, we can leave it null or set it.
    # Let's assume we want to support it if provided.
    
    logger.info("Creating new user", extra={"email": user_in.email, "user_id": user_id})
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, username, name, email, password_hash, image, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            user_in.username,
            user_in.name,
            user_in.email,
            hashed_password,
            user_in.image,
            created_at
        )
    )
    db.commit()
    
    return {
        "id": user_id,
        "username": user_in.username,
        "name": user_in.name,
        "email": user_in.email,
        "image": user_in.image,
        "created_at": created_at
    }

def set_password_reset_token(
    db: Connection,
    user_id: str,
    token_hash: str,
    expires_at: int,
    requested_at: int
) -> None:
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE users
        SET password_reset_token_hash = ?, password_reset_expires_at = ?, password_reset_requested_at = ?
        WHERE id = ?
        """,
        (token_hash, expires_at, requested_at, user_id)
    )
    db.commit()

def get_user_by_password_reset_token_hash(db: Connection, token_hash: str) -> Optional[dict]:
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE password_reset_token_hash = ?",
        (token_hash,)
    )
    row = cursor.fetchone()
    return dict(row) if row else None

def clear_password_reset_fields(db: Connection, user_id: str) -> None:
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE users
        SET password_reset_token_hash = NULL, password_reset_expires_at = NULL, password_reset_requested_at = NULL
        WHERE id = ?
        """,
        (user_id,)
    )
    db.commit()

def update_password_hash(db: Connection, user_id: str, password_hash: str) -> None:
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (password_hash, user_id)
    )
    db.commit()

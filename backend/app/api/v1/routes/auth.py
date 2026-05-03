import os
import time

from fastapi import APIRouter, Depends, HTTPException, status
from sqlite3 import Connection
from app.db.session import get_db
from app.schemas.user import (
    UserCreate,
    UserPublic,
    Token,
    UserLogin,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    MessageResponse,
)
from app.repositories import user as user_repo
from app.core.security import (
    verify_password,
    create_access_token,
    generate_password_reset_token,
    hash_password_reset_token,
    get_password_hash,
)
from app.core.email import send_password_reset_email, smtp_enabled
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.post("/register", response_model=UserPublic)
def register(user_in: UserCreate, db: Connection = Depends(get_db)):
    # Check if email already exists
    db_user = user_repo.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    # Check if username already exists
    db_user = user_repo.get_user_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username already exists."
        )
    return user_repo.create_user(db, user_in=user_in)

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Connection = Depends(get_db)):
    user = user_repo.get_user_by_identifier(db, identifier=user_in.username)
    if not user or not verify_password(user_in.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user["id"])
    logger.info("User logged in", extra={"user_id": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Connection = Depends(get_db)):
    # Always return 200 with a generic message to avoid account enumeration.
    message = "If an account exists for that identifier, we have sent password reset instructions."

    user = user_repo.get_user_by_identifier(db, identifier=req.identifier)
    if not user:
        return {"message": message}

    now = int(time.time())
    expires_at = now + 60 * 60

    reset_token = generate_password_reset_token()
    token_hash = hash_password_reset_token(reset_token)

    user_repo.set_password_reset_token(
        db,
        user_id=user["id"],
        token_hash=token_hash,
        expires_at=expires_at,
        requested_at=now,
    )

    frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    reset_url = f"{frontend_base_url}/reset-password?token={reset_token}"
    debug_enabled = os.getenv("PASSWORD_RESET_DEBUG", "false").lower() == "true"

    if smtp_enabled():
        try:
            send_password_reset_email(
                recipient_email=user["email"],
                recipient_name=user.get("name"),
                reset_url=reset_url,
            )
        except Exception:
            logger.exception("Password reset email delivery failed", extra={"user_id": user["id"]})
            return {"message": message}

    if not debug_enabled:
        return {"message": message}

    return {"message": message, "reset_token": reset_token, "reset_url": reset_url}

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Connection = Depends(get_db)):
    token_hash = hash_password_reset_token(req.token)
    user = user_repo.get_user_by_password_reset_token_hash(db, token_hash=token_hash)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    expires_at = user.get("password_reset_expires_at")
    if not expires_at or int(time.time()) > int(expires_at):
        # Clear stale token fields to avoid repeated attempts.
        user_repo.clear_password_reset_fields(db, user_id=user["id"])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    new_hash = get_password_hash(req.new_password)
    user_repo.update_password_hash(db, user_id=user["id"], password_hash=new_hash)
    user_repo.clear_password_reset_fields(db, user_id=user["id"])

    return {"message": "Password updated successfully"}

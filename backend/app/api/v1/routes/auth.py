from fastapi import APIRouter, Depends, HTTPException, status
from sqlite3 import Connection
from app.db.session import get_db
from app.schemas.user import UserCreate, UserPublic, Token, UserLogin
from app.repositories import user as user_repo
from app.core.security import verify_password, create_access_token

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
    return {"access_token": access_token, "token_type": "bearer"}

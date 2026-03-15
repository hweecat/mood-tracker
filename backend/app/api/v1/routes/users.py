from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlite3 import Connection
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.user import UserPublic, UserBase

router = APIRouter()

class UserUpdate(UserBase):
    pass

@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: UserPublic = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserPublic)
def update_user_me(
    user_in: UserUpdate,
    db: Connection = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user)
):
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET name = ?, email = ?, image = ? WHERE id = ?",
        (user_in.name, user_in.email, user_in.image, current_user.id)
    )
    db.commit()
    return {**current_user.model_dump(), **user_in.model_dump(exclude_unset=True)}

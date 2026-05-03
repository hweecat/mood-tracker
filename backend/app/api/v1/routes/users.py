from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlite3 import Connection
from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.user import UserPublic

router = APIRouter()

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    image: str | None = None

@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: UserPublic = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserPublic)
def update_user_me(
    user_in: UserUpdate,
    db: Connection = Depends(get_db),
    current_user: UserPublic = Depends(get_current_user)
):
    updated_name = user_in.name if user_in.name is not None else current_user.name
    updated_email = user_in.email if user_in.email is not None else current_user.email
    updated_image = user_in.image if user_in.image is not None else current_user.image

    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET name = ?, email = ?, image = ? WHERE id = ?",
        (updated_name, updated_email, updated_image, current_user.id)
    )
    db.commit()
    return {
        **current_user.model_dump(),
        "name": updated_name,
        "email": updated_email,
        "image": updated_image,
    }

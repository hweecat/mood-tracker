from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.db.session import get_db

router = APIRouter()

class UserUpdate(BaseModel):
    name: str
    email: str

@router.get("/me")
def read_user_me(db = Depends(get_db)):
    user_id = "1"
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)

@router.put("/me")
def update_user_me(user_in: UserUpdate, db = Depends(get_db)):
    user_id = "1"
    cursor = db.cursor()
    cursor.execute(
        "UPDATE users SET name = ?, email = ? WHERE id = ?",
        (user_in.name, user_in.email, user_id)
    )
    db.commit()
    return {"id": user_id, **user_in.model_dump()}

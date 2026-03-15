from typing import Optional
from pydantic import EmailStr, Field
from app.schemas.base import TunedBaseModel

class UserBase(TunedBaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    name: Optional[str] = None
    image: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserPublic(UserBase):
    id: str
    created_at: Optional[int] = None

class Token(TunedBaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(TunedBaseModel):
    user_id: Optional[str] = None

class UserLogin(TunedBaseModel):
    username: str
    password: str

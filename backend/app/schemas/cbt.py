from typing import List, Optional
from app.schemas.base import TunedBaseModel

class CBTLogBase(TunedBaseModel):
    timestamp: int
    situation: str
    automatic_thoughts: str
    distortions: List[str]
    rational_response: str
    mood_before: int
    mood_after: Optional[int] = None
    behavioral_link: Optional[str] = None

class CBTLogCreate(CBTLogBase):
    id: str

class CBTLogPublic(CBTLogBase):
    id: str
    user_id: str

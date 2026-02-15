from typing import List, Optional
from app.schemas.base import TunedBaseModel

class MoodAnalysisPublic(TunedBaseModel):
    sentiment_score: float
    subjectivity: float
    keywords: List[str]

class MoodBase(TunedBaseModel):
    rating: int
    emotions: List[str]
    note: Optional[str] = None
    trigger: Optional[str] = None
    behavior: Optional[str] = None
    timestamp: int

class MoodCreate(MoodBase):
    id: str

class MoodPublic(MoodBase):
    id: str
    user_id: str
    ai_analysis: Optional[MoodAnalysisPublic] = None

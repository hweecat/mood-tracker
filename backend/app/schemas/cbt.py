from typing import List, Optional
from app.schemas.base import TunedBaseModel

# --- Phase 2: AI Analysis & HITL Schemas ---

class DistortionSuggestion(TunedBaseModel):
    """
    An AI-suggested distortion that the user can review and select.
    """
    distortion: str
    reasoning: str
    confidence: Optional[float] = None # AI's confidence in this suggestion

class RationalReframe(TunedBaseModel):
    """
    An AI-generated healthier alternative to an automatic thought.
    """
    perspective: str # e.g., "Compassionate", "Logical", "Evidence-based"
    content: str

class CBTAnalysisRequest(TunedBaseModel):
    """
    Incoming request to analyze an automatic thought.
    """
    situation: str
    automatic_thought: str

class CBTAnalysisResponse(TunedBaseModel):
    """
    The structured result of the cognitive analysis, presented as suggestions.
    """
    suggestions: List[DistortionSuggestion]
    reframes: List[RationalReframe]
    prompt_version: Optional[str] = None

# --- Core CBT Log Schemas ---

class CBTLogBase(TunedBaseModel):
    timestamp: int
    situation: str
    automatic_thoughts: str
    distortions: List[str] # These are the USER-CONFIRMED distortions
    rational_response: str
    mood_before: int
    mood_after: Optional[int] = None
    behavioral_link: Optional[str] = None
    action_plan_status: Optional[str] = "pending"
    
    # HITL Metadata: Track what was influenced by AI
    ai_suggested_distortions: Optional[List[str]] = None 

class CBTLogCreate(CBTLogBase):
    id: str

class CBTLogPublic(CBTLogBase):
    id: str
    user_id: str
    ai_analysis: Optional[CBTAnalysisResponse] = None

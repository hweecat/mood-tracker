from typing import Optional
from .base import TunedBaseModel

class AIAuditLogBase(TunedBaseModel):
    id: str
    correlation_id: str
    masked_payload: Optional[str] = None
    response_payload: Optional[str] = None
    safety_ratings: Optional[str] = None
    ignored_suggestions: Optional[str] = None
    status: str
    timestamp: int

class AIAuditLogCreate(AIAuditLogBase):
    pass

class AIAuditLogPublic(AIAuditLogBase):
    pass

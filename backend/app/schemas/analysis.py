from typing import Any, Optional

from app.schemas.base import TunedBaseModel


class AnalysisJobPublic(TunedBaseModel):
    id: str
    user_id: str
    entry_type: str
    entry_id: str
    analysis_type: str
    status: str
    result_payload: Optional[dict[str, Any]] = None
    error_code: Optional[str] = None
    created_at: int
    updated_at: int

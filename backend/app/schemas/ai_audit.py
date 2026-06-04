from typing import Any, Optional

from app.schemas.base import TunedBaseModel


class AIAuditLogCreate(TunedBaseModel):
    correlation_id: str
    user_id: Optional[str] = None
    entry_type: Optional[str] = None
    entry_id: Optional[str] = None
    operation: str
    provider: str
    model: str
    prompt_version_id: Optional[str] = None
    masked_request_payload: Optional[dict[str, Any]] = None
    response_payload: Optional[dict[str, Any]] = None
    safety_ratings: Optional[dict[str, Any]] = None
    safety_tier: Optional[str] = None
    latency_ms: int
    status: str
    error_code: Optional[str] = None
    schema_version: int = 1
    created_at: Optional[int] = None


class AIFeedbackEventCreate(TunedBaseModel):
    audit_log_id: Optional[str] = None
    user_id: str
    cbt_log_id: str
    ai_suggestions_payload: Optional[list[dict[str, Any]]] = None
    ai_reframes_payload: Optional[list[dict[str, Any]]] = None
    ai_action_plans_payload: Optional[list[dict[str, Any]]] = None
    accepted_distortions_payload: Optional[list[dict[str, Any]]] = None
    ignored_distortions_payload: Optional[list[dict[str, Any]]] = None
    accepted_reframe_payload: Optional[dict[str, Any]] = None
    ignored_reframes_payload: Optional[list[dict[str, Any]]] = None
    user_rational_response: Optional[str] = None
    accepted_action_plan_payload: Optional[dict[str, Any]] = None
    user_action_plan: Optional[str] = None
    source: str
    created_at: Optional[int] = None

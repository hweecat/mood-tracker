import uuid

from app.schemas.ai_audit import AIAuditLogCreate
from app.schemas.cbt import CBTAnalysisRequest, CBTAnalysisResponse
from app.services import ai_audit_service as default_audit_service
from app.services.llm_provider import (
    LLMParseError,
    LLMProvider,
    LLMProviderError,
    LLMResult,
    LLMTimeoutError,
    LLMSafetyBlocked,
)


class LLMOrchestrator:
    def __init__(self, providers: list[LLMProvider], audit_service=default_audit_service):
        if not providers:
            raise ValueError("At least one LLM provider is required")
        self.providers = providers
        self.audit_service = audit_service

    async def analyze_cbt(
        self,
        request: CBTAnalysisRequest,
        user_id: str | None = None,
    ) -> CBTAnalysisResponse:
        last_error: Exception | None = None
        correlation_id = str(uuid.uuid4())
        for provider in self.providers:
            try:
                result = await provider.analyze_cbt(request)
            except LLMSafetyBlocked as exc:
                self._record_attempt(
                    request=request,
                    provider=provider.provider,
                    model=provider.model,
                    correlation_id=correlation_id,
                    status="safety_blocked",
                    safety_tier="high",
                    latency_ms=0,
                    error_code=type(exc).__name__,
                    user_id=user_id,
                )
                raise
            except LLMParseError as exc:
                last_error = exc
                self._record_attempt(
                    request=request,
                    provider=provider.provider,
                    model=provider.model,
                    correlation_id=correlation_id,
                    status="parse_error",
                    safety_tier="error",
                    latency_ms=0,
                    error_code=type(exc).__name__,
                    user_id=user_id,
                )
            except LLMTimeoutError as exc:
                last_error = exc
                self._record_attempt(
                    request=request,
                    provider=provider.provider,
                    model=provider.model,
                    correlation_id=correlation_id,
                    status="timeout",
                    safety_tier="error",
                    latency_ms=0,
                    error_code=type(exc).__name__,
                    user_id=user_id,
                )
            except LLMProviderError as exc:
                last_error = exc
                self._record_attempt(
                    request=request,
                    provider=provider.provider,
                    model=provider.model,
                    correlation_id=correlation_id,
                    status="provider_error",
                    safety_tier="error",
                    latency_ms=0,
                    error_code=type(exc).__name__,
                    user_id=user_id,
                )
            else:
                try:
                    response = self._to_response(result, audit_id=None)
                except Exception as exc:
                    last_error = LLMParseError("Provider response did not match CBT schema")
                    self._record_attempt(
                        request=request,
                        provider=result.provider,
                        model=result.model,
                        correlation_id=correlation_id,
                        status="parse_error",
                        safety_tier="error",
                        latency_ms=result.latency_ms,
                        error_code=type(exc).__name__,
                        user_id=user_id,
                    )
                    continue
                audit_id = self._record_attempt(
                    request=request,
                    provider=result.provider,
                    model=result.model,
                    correlation_id=correlation_id,
                    status="success",
                    safety_tier="negligible",
                    latency_ms=result.latency_ms,
                    safety_ratings=result.safety_ratings,
                    prompt_version_id=result.parsed_payload.get("prompt_version"),
                    response_payload=result.parsed_payload,
                    user_id=user_id,
                )
                response.analysis_id = audit_id
                response.ai_analysis_id = audit_id
                return response

        if last_error:
            raise last_error
        raise LLMProviderError("No provider returned a CBT response")

    def _record_attempt(
        self,
        request: CBTAnalysisRequest,
        provider: str,
        model: str,
        correlation_id: str,
        status: str,
        safety_tier: str,
        latency_ms: int,
        error_code: str | None = None,
        prompt_version_id: str | None = None,
        safety_ratings: dict | None = None,
        response_payload: dict | None = None,
        user_id: str | None = None,
    ) -> str | None:
        audit_in = AIAuditLogCreate(
            correlation_id=correlation_id,
            user_id=user_id,
            entry_type="standalone_analysis",
            operation="generate_reframes",
            provider=provider,
            model=model,
            prompt_version_id=prompt_version_id,
            masked_request_payload={
                "automatic_thought_length": len(request.automatic_thought),
                "situation_length": len(request.situation),
            },
            response_payload=response_payload,
            safety_ratings=safety_ratings,
            safety_tier=safety_tier,
            latency_ms=latency_ms,
            status=status,
            error_code=error_code,
            schema_version=1,
        )
        audit_id = self.audit_service.record_ai_audit_log(audit_in)
        return audit_id if isinstance(audit_id, str) else None

    def _to_response(self, result: LLMResult, audit_id: str | None) -> CBTAnalysisResponse:
        return CBTAnalysisResponse(
            suggestions=result.parsed_payload["suggestions"],
            reframes=result.parsed_payload["reframes"],
            prompt_version=result.parsed_payload.get("prompt_version"),
            analysis_id=audit_id,
            ai_analysis_id=audit_id,
            provider=result.provider,
            model=result.model,
        )

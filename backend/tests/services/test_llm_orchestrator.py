import pytest

from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_orchestrator import LLMOrchestrator
from app.services.llm_provider import (
    LLMProviderError,
    LLMResult,
    LLMSafetyBlocked,
)


class FakeProvider:
    def __init__(self, provider, model, outcome):
        self.provider = provider
        self.model = model
        self.outcome = outcome

    async def analyze_cbt(self, request):
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


class FakeAuditService:
    def __init__(self):
        self.records = []

    def record_ai_audit_log(self, audit_in):
        self.records.append(audit_in)
        return f"audit-{len(self.records)}"


@pytest.fixture
def cbt_request():
    return CBTAnalysisRequest(
        situation="I made a mistake in a meeting",
        automatic_thought="Everyone thinks I am incompetent",
    )


@pytest.mark.anyio
async def test_orchestrator_falls_back_and_audits_each_attempt(cbt_request):
    success = LLMResult(
        provider="openai",
        model="gpt-5.5",
        raw_payload={"id": "resp_1"},
        parsed_payload={
            "suggestions": [{"distortion": "Mind Reading", "reasoning": "Assumes others' thoughts"}],
            "reframes": [{"perspective": "Logical", "content": "I cannot know what everyone thinks."}],
            "prompt_version": "provider-openai",
        },
        latency_ms=12,
    )
    audit_service = FakeAuditService()
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider("gemini", "gemini-1.5-flash", LLMProviderError("temporary outage")),
            FakeProvider("openai", "gpt-5.5", success),
        ],
        audit_service=audit_service,
    )

    response = await orchestrator.analyze_cbt(cbt_request, user_id="user-1")

    assert response.provider == "openai"
    assert response.model == "gpt-5.5"
    assert response.ai_analysis_id == "audit-2"
    assert [record.provider for record in audit_service.records] == ["gemini", "openai"]
    assert [record.status for record in audit_service.records] == ["provider_error", "success"]
    assert [record.user_id for record in audit_service.records] == ["user-1", "user-1"]
    assert all("automatic_thought" not in record.masked_request_payload for record in audit_service.records)


@pytest.mark.anyio
async def test_orchestrator_treats_non_object_provider_json_as_parse_error(cbt_request):
    success = LLMResult(
        provider="openai",
        model="gpt-5.5",
        raw_payload={"id": "resp_2"},
        parsed_payload={
            "suggestions": [{"distortion": "Mind Reading", "reasoning": "Assumes others' thoughts"}],
            "reframes": [{"perspective": "Logical", "content": "I cannot know what everyone thinks."}],
            "prompt_version": "provider-openai",
        },
        latency_ms=12,
    )
    audit_service = FakeAuditService()
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                "ollama",
                "llama3.1",
                LLMResult(
                    provider="ollama",
                    model="llama3.1",
                    raw_payload={},
                    parsed_payload=["not-an-object"],
                    latency_ms=1,
                ),
            ),
            FakeProvider("openai", "gpt-5.5", success),
        ],
        audit_service=audit_service,
    )

    response = await orchestrator.analyze_cbt(cbt_request)

    assert response.provider == "openai"
    assert [record.provider for record in audit_service.records] == ["ollama", "openai"]
    assert [record.status for record in audit_service.records] == ["parse_error", "success"]


@pytest.mark.anyio
async def test_orchestrator_stops_fallback_on_safety_block(cbt_request):
    audit_service = FakeAuditService()
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                "gemini",
                "gemini-1.5-flash",
                LLMSafetyBlocked("Safety message", crisis_resources=[{"phone": "988"}]),
            ),
            FakeProvider(
                "openai",
                "gpt-5.5",
                LLMResult(
                    provider="openai",
                    model="gpt-5.5",
                    raw_payload={},
                    parsed_payload={"suggestions": [], "reframes": []},
                    latency_ms=1,
                ),
            ),
        ],
        audit_service=audit_service,
    )

    with pytest.raises(LLMSafetyBlocked):
        await orchestrator.analyze_cbt(cbt_request)

    assert [record.provider for record in audit_service.records] == ["gemini"]
    assert audit_service.records[0].status == "safety_blocked"

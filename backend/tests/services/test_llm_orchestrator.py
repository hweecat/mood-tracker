import json
import sqlite3

import pytest

from app.repositories.ai_audit import create_ai_audit_log
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


class PersistingAuditService:
    def __init__(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(
            """
            CREATE TABLE ai_audit_logs (
                id TEXT PRIMARY KEY,
                correlation_id TEXT NOT NULL,
                user_id TEXT,
                entry_type TEXT,
                entry_id TEXT,
                operation TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_version_id TEXT,
                masked_request_payload TEXT,
                response_payload TEXT,
                safety_ratings TEXT,
                safety_tier TEXT,
                latency_ms INTEGER NOT NULL,
                status TEXT NOT NULL,
                error_code TEXT,
                schema_version INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );
            """
        )

    def record_ai_audit_log(self, audit_in):
        return create_ai_audit_log(self.db, audit_in)


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
    assert response.analysis_id == "audit-2"
    assert response.ai_analysis_id == "audit-2"
    assert [record.provider for record in audit_service.records] == ["gemini", "openai"]
    assert [record.status for record in audit_service.records] == ["provider_error", "success"]
    assert {record.correlation_id for record in audit_service.records} == {
        audit_service.records[0].correlation_id
    }
    assert [record.user_id for record in audit_service.records] == ["user-1", "user-1"]
    assert all("automatic_thought" not in record.masked_request_payload for record in audit_service.records)


@pytest.mark.anyio
async def test_successful_orchestrated_response_stores_response_payload_in_audit_log(cbt_request):
    parsed_payload = {
        "suggestions": [{"distortion": "Mind Reading", "reasoning": "Assumes others' thoughts"}],
        "reframes": [{"perspective": "Logical", "content": "I cannot know what everyone thinks."}],
        "prompt_version": "provider-openai",
    }
    success = LLMResult(
        provider="openai",
        model="gpt-5.5",
        raw_payload={"id": "resp_1"},
        parsed_payload=parsed_payload,
        latency_ms=12,
    )
    audit_service = PersistingAuditService()
    orchestrator = LLMOrchestrator(
        providers=[FakeProvider("openai", "gpt-5.5", success)],
        audit_service=audit_service,
    )

    response = await orchestrator.analyze_cbt(cbt_request, user_id="user-1")

    row = audit_service.db.execute(
        "SELECT response_payload FROM ai_audit_logs WHERE id = ?",
        (response.ai_analysis_id,),
    ).fetchone()
    assert json.loads(row["response_payload"]) == parsed_payload


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


@pytest.mark.anyio
async def test_orchestrator_falls_back_when_provider_returns_malformed_payload(cbt_request):
    malformed = LLMResult(
        provider="openai",
        model="gpt-5.5",
        raw_payload={"id": "bad"},
        parsed_payload={"reframes": []},
        latency_ms=2,
    )
    success = LLMResult(
        provider="ollama",
        model="llama3.1",
        raw_payload={"id": "ok"},
        parsed_payload={
            "suggestions": [],
            "reframes": [{"perspective": "Balanced", "content": "One step is enough."}],
        },
        latency_ms=3,
    )
    audit_service = FakeAuditService()
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider("openai", "gpt-5.5", malformed),
            FakeProvider("ollama", "llama3.1", success),
        ],
        audit_service=audit_service,
    )

    response = await orchestrator.analyze_cbt(cbt_request)

    assert response.provider == "ollama"
    assert [record.status for record in audit_service.records] == ["parse_error", "success"]

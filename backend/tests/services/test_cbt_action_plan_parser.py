import pytest
from pydantic import ValidationError

from app.schemas.cbt import CBTActionPlan, CBTAnalysisRequest, CBTAnalysisResponse
from app.services.llm_orchestrator import LLMOrchestrator
from app.services.llm_provider import LLMParseError, LLMResult


class FakeProvider:
    provider = "gemini"
    model = "gemini-1.5-flash"

    def __init__(self, parsed_payload):
        self.parsed_payload = parsed_payload

    async def analyze_cbt(self, request):
        return LLMResult(
            provider=self.provider,
            model=self.model,
            raw_payload={},
            parsed_payload=self.parsed_payload,
            latency_ms=1,
        )


class FakeAuditService:
    def record_ai_audit_log(self, audit_in):
        return "audit-1"


@pytest.fixture
def cbt_request():
    return CBTAnalysisRequest(
        situation="I need to reply to a difficult email",
        automatic_thought="I will make everything worse",
    )


def test_cbt_analysis_response_accepts_action_plans():
    response = CBTAnalysisResponse(
        analysis_id="analysis-1",
        suggestions=[],
        reframes=[],
        action_plans=[
            CBTActionPlan(
                id="plan-1",
                title="Send one message",
                rationale="A small outreach step can reduce avoidance.",
                steps=["Text one trusted friend and ask for a short check-in."],
                timeframe="today",
            )
        ],
        provider="gemini",
        model="gemini-1.5-flash",
        prompt_version="cbt-v2",
    )

    assert response.action_plans[0].title == "Send one message"
    assert response.model_dump(by_alias=True)["actionPlans"][0]["id"] == "plan-1"


def test_cbt_analysis_response_rejects_duplicate_ids():
    plan = CBTActionPlan(
        id="plan-1",
        title="Send one message",
        rationale="A small outreach step can reduce avoidance.",
        steps=["Text one trusted friend and ask for a short check-in."],
        timeframe="today",
    )

    with pytest.raises(ValidationError, match="Duplicate action plan id"):
        CBTAnalysisResponse(
            suggestions=[],
            reframes=[],
            action_plans=[plan, plan.model_copy()],
        )


@pytest.mark.anyio
async def test_orchestrator_accepts_snake_case_action_plans(cbt_request):
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                {
                    "suggestions": [],
                    "reframes": [],
                    "action_plans": [
                        {
                            "id": "plan-1",
                            "title": "Take a short walk",
                            "rationale": "A brief reset can create room before responding.",
                            "steps": ["Walk outside for five minutes before sending a reply."],
                            "timeframe": "today",
                        }
                    ],
                }
            )
        ],
        audit_service=FakeAuditService(),
    )

    response = await orchestrator.analyze_cbt(request=cbt_request)

    assert response.action_plans[0].id == "plan-1"


@pytest.mark.anyio
async def test_orchestrator_accepts_camel_case_action_plans(cbt_request):
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                {
                    "suggestions": [],
                    "reframes": [],
                    "actionPlans": [
                        {
                            "id": "plan-1",
                            "title": "Write one note",
                            "rationale": "A small written step can make the next choice clearer.",
                            "steps": ["Write down one thing you can do in the next ten minutes."],
                            "timeframe": "now",
                        }
                    ],
                }
            )
        ],
        audit_service=FakeAuditService(),
    )

    response = await orchestrator.analyze_cbt(request=cbt_request)

    assert response.action_plans[0].title == "Write one note"


@pytest.mark.anyio
async def test_orchestrator_assigns_stable_ids_when_provider_omits_ids(cbt_request):
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                {
                    "suggestions": [
                        {
                            "distortion": "All-or-Nothing Thinking",
                            "reasoning": "The thought treats one outcome as total failure.",
                        }
                    ],
                    "reframes": [
                        {
                            "perspective": "Compassionate",
                            "content": "A difficult email can feel heavy without meaning you will fail.",
                        }
                    ],
                    "action_plans": [
                        {
                            "title": "Draft one sentence",
                            "rationale": "A tiny draft lowers the barrier to responding.",
                            "steps": ["Write the first sentence without sending it yet."],
                            "timeframe": "today",
                        }
                    ],
                }
            )
        ],
        audit_service=FakeAuditService(),
    )

    response = await orchestrator.analyze_cbt(request=cbt_request)

    assert response.suggestions[0].id == "suggestion-1"
    assert response.reframes[0].id == "reframe-1"
    assert response.action_plans[0].id == "plan-1"


@pytest.mark.anyio
async def test_orchestrator_rejects_malformed_action_plans(cbt_request):
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                {
                    "suggestions": [],
                    "reframes": [],
                    "action_plans": [
                        {
                            "id": "plan-1",
                            "title": "Too vague",
                            "steps": [],
                        }
                    ],
                }
            )
        ],
        audit_service=FakeAuditService(),
    )

    with pytest.raises(LLMParseError):
        await orchestrator.analyze_cbt(request=cbt_request)


@pytest.mark.anyio
async def test_orchestrator_rejects_non_object_action_plan_items(cbt_request):
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                {
                    "suggestions": [],
                    "reframes": [],
                    "action_plans": ["not-an-object"],
                }
            )
        ],
        audit_service=FakeAuditService(),
    )

    with pytest.raises(LLMParseError):
        await orchestrator.analyze_cbt(request=cbt_request)


@pytest.mark.anyio
async def test_orchestrator_rejects_duplicate_provider_ids(cbt_request):
    plan = {
        "id": "plan-1",
        "title": "Send one message",
        "rationale": "A small outreach step can reduce avoidance.",
        "steps": ["Text one trusted friend and ask for a short check-in."],
        "timeframe": "today",
    }
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                {
                    "suggestions": [],
                    "reframes": [],
                    "action_plans": [plan, plan.copy()],
                }
            )
        ],
        audit_service=FakeAuditService(),
    )

    with pytest.raises(LLMParseError):
        await orchestrator.analyze_cbt(request=cbt_request)


@pytest.mark.anyio
async def test_orchestrator_rejects_more_than_three_action_plans(cbt_request):
    plan = {
        "id": "plan-1",
        "title": "Send one message",
        "rationale": "A small outreach step can reduce avoidance.",
        "steps": ["Text one trusted friend and ask for a short check-in."],
        "timeframe": "today",
    }
    orchestrator = LLMOrchestrator(
        providers=[
            FakeProvider(
                {
                    "suggestions": [],
                    "reframes": [],
                    "action_plans": [plan, plan | {"id": "plan-2"}, plan | {"id": "plan-3"}, plan | {"id": "plan-4"}],
                }
            )
        ],
        audit_service=FakeAuditService(),
    )

    with pytest.raises(LLMParseError):
        await orchestrator.analyze_cbt(request=cbt_request)

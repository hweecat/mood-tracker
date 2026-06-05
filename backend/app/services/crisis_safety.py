from app.core.constants import CRISIS_RESOURCES
from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_provider import LLMSafetyBlocked


CRISIS_TERMS = (
    "kill myself",
    "end it all",
    "suicide",
    "suicidal",
    "self-harm",
    "self harm",
    "harm myself",
    "hurt myself",
    "want to die",
    "don't want to live",
    "do not want to live",
)


def raise_if_crisis_intent(request: CBTAnalysisRequest) -> None:
    text = f"{request.situation} {request.automatic_thought}".casefold()
    if any(term in text for term in CRISIS_TERMS):
        raise LLMSafetyBlocked(
            "Your safety is important. Please reach out for support.",
            crisis_resources=CRISIS_RESOURCES,
        )

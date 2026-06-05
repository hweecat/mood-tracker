from dataclasses import dataclass
import re
from typing import Any, Protocol

from app.schemas.cbt import CBTAnalysisRequest


@dataclass
class LLMResult:
    provider: str
    model: str
    raw_payload: dict[str, Any]
    parsed_payload: dict[str, Any]
    latency_ms: int
    safety_ratings: dict[str, Any] | None = None


class LLMProvider(Protocol):
    provider: str
    model: str

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> LLMResult:
        ...


class LLMProviderError(Exception):
    pass


class LLMTimeoutError(LLMProviderError):
    pass


class LLMParseError(LLMProviderError):
    pass


class LLMSafetyBlocked(LLMProviderError):
    def __init__(
        self,
        message: str,
        crisis_resources: list[dict[str, Any]] | None = None,
    ):
        self.message = message
        self.crisis_resources = crisis_resources or []
        super().__init__(message)


EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"\b(?:\+?\d[\d\s().-]{7,}\d)\b")


def minimize_text_for_provider(text: str) -> str:
    masked = EMAIL_RE.sub("[email]", text)
    masked = PHONE_RE.sub("[phone]", masked)
    return masked


def minimize_cbt_request_for_provider(request: CBTAnalysisRequest) -> CBTAnalysisRequest:
    return CBTAnalysisRequest(
        situation=minimize_text_for_provider(request.situation),
        automatic_thought=minimize_text_for_provider(request.automatic_thought),
    )

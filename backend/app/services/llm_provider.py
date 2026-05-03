from dataclasses import dataclass
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

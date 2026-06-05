import json
import time
from typing import Any

import httpx

from app.core.logging import get_logger
from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_provider import (
    LLMParseError,
    LLMProviderError,
    LLMResult,
    LLMTimeoutError,
    minimize_cbt_request_for_provider,
)

logger = get_logger(__name__)


CBT_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "name": "cbt_analysis",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "suggestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "distortion": {"type": "string"},
                        "reasoning": {"type": "string"},
                    },
                    "required": ["distortion", "reasoning"],
                },
            },
            "reframes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "perspective": {"type": "string"},
                        "content": {"type": "string"},
                    },
                    "required": ["perspective", "content"],
                },
            },
            "prompt_version": {"type": "string"},
        },
        "required": ["suggestions", "reframes"],
    },
}


class OpenAIClient:
    provider = "openai"

    def __init__(
        self,
        api_key: str,
        model: str,
        http_client: httpx.AsyncClient | None = None,
        timeout: int = 10,
    ):
        self.api_key = api_key
        self.model = model
        self.http_client = http_client or httpx.AsyncClient()
        self.timeout = timeout

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> LLMResult:
        start = time.time()
        minimized_request = minimize_cbt_request_for_provider(request)
        try:
            response = await self.http_client.post(
                "https://api.openai.com/v1/responses",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "input": self._build_prompt(minimized_request),
                    "text": {"format": CBT_OUTPUT_SCHEMA},
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
            parsed = self._extract_structured_output(payload)
        except httpx.TimeoutException as exc:
            logger.error(
                "OpenAI provider request timed out",
                extra={"error_type": type(exc).__name__},
            )
            raise LLMTimeoutError("OpenAI provider request timed out") from exc
        except httpx.HTTPError as exc:
            logger.error(
                "OpenAI provider request failed",
                extra={"error_type": type(exc).__name__},
            )
            raise LLMProviderError("OpenAI provider request failed") from exc
        except (json.JSONDecodeError, ValueError, KeyError, TypeError) as exc:
            logger.error(
                "OpenAI provider response parse failed",
                extra={"error_type": type(exc).__name__},
            )
            raise LLMParseError("OpenAI response was not valid CBT JSON") from exc

        return LLMResult(
            provider=self.provider,
            model=self.model,
            raw_payload=payload,
            parsed_payload=parsed,
            latency_ms=int((time.time() - start) * 1000),
        )

    def _extract_structured_output(self, payload: dict[str, Any]) -> dict[str, Any]:
        for output in payload.get("output", []):
            for content in output.get("content", []):
                if content.get("type") == "output_text":
                    return json.loads(content["text"])
        raise LLMParseError("OpenAI response did not include output_text")

    def _build_prompt(self, request: CBTAnalysisRequest) -> str:
        return (
            "Analyze this CBT journal entry. Return JSON with suggestions and reframes. "
            f"Situation: {request.situation}\n"
            f"Automatic thought: {request.automatic_thought}"
        )

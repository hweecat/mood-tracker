import json
import time
from typing import Any

import httpx

from app.schemas.cbt import CBTAnalysisRequest
from app.services.crisis_safety import raise_if_crisis_intent
from app.services.llm_provider import LLMParseError, LLMProviderError, LLMResult


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
                        "id": {"type": "string"},
                        "distortion": {"type": "string"},
                        "reasoning": {"type": "string"},
                    },
                    "required": ["id", "distortion", "reasoning"],
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
                        "id": {"type": "string"},
                    },
                    "required": ["id", "perspective", "content"],
                },
            },
            "action_plans": {
                "type": "array",
                "minItems": 1,
                "maxItems": 3,
                "items": {
                    "type": "object",
                    "additionalProperties": True,
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "rationale": {"type": "string"},
                        "steps": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                        "timeframe": {"type": "string"},
                    },
                    "required": ["id", "title", "rationale", "steps", "timeframe"],
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
        raise_if_crisis_intent(request)
        start = time.time()
        response = await self.http_client.post(
            "https://api.openai.com/v1/responses",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "input": self._build_prompt(request),
                "text": {"format": CBT_OUTPUT_SCHEMA},
            },
            timeout=self.timeout,
        )
        try:
            response.raise_for_status()
            payload = response.json()
            parsed = self._extract_structured_output(payload)
        except (httpx.HTTPError, KeyError, TypeError) as exc:
            raise LLMProviderError("OpenAI provider request failed") from exc
        except (json.JSONDecodeError, ValueError) as exc:
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
            "Analyze this CBT journal entry. Return JSON with suggestions, reframes, "
            "and 1 to 3 optional action_plans. Keep reframes validating, non-diagnostic, "
            "and agency-preserving; include stable ids for each item, and make each "
            "action plan one small next step. If the content suggests crisis or "
            "self-harm, do not generate ordinary action plans; keep the response "
            "on the crisis safety path. "
            f"Situation: {request.situation}\n"
            f"Automatic thought: {request.automatic_thought}"
        )

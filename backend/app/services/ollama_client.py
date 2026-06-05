import json
import time

import httpx

from app.schemas.cbt import CBTAnalysisRequest
from app.services.crisis_safety import raise_if_crisis_intent
from app.services.llm_provider import LLMParseError, LLMProviderError, LLMResult
from app.services.pii_masking import mask_provider_text


class OllamaClient:
    provider = "ollama"

    def __init__(
        self,
        base_url: str,
        model: str,
        http_client: httpx.AsyncClient | None = None,
        timeout: int = 10,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.http_client = http_client or httpx.AsyncClient()
        self.timeout = timeout

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> LLMResult:
        raise_if_crisis_intent(request)
        start = time.time()
        url = f"{self.base_url}/api/generate"
        response = await self.http_client.post(
            url,
            json={
                "model": self.model,
                "prompt": self._build_prompt(request),
                "stream": False,
                "format": "json",
            },
            timeout=self.timeout,
        )
        try:
            response.raise_for_status()
            payload = response.json()
            parsed = json.loads(payload["response"])
        except (httpx.HTTPError, KeyError, TypeError) as exc:
            raise LLMProviderError("Ollama provider request failed") from exc
        except (json.JSONDecodeError, ValueError) as exc:
            raise LLMParseError("Ollama response was not valid CBT JSON") from exc

        return LLMResult(
            provider=self.provider,
            model=self.model,
            raw_payload=payload,
            parsed_payload=parsed,
            latency_ms=int((time.time() - start) * 1000),
        )

    def _build_prompt(self, request: CBTAnalysisRequest) -> str:
        situation = mask_provider_text(request.situation)
        automatic_thought = mask_provider_text(request.automatic_thought)
        return (
            "Analyze this CBT journal entry. Return JSON with suggestions, reframes, "
            "and 1 to 3 optional action_plans. Keep reframes validating, non-diagnostic, "
            "and agency-preserving; include stable ids for each item, and make each "
            "action plan one small next step. If the content suggests crisis or "
            "self-harm, do not generate ordinary action plans; keep the response "
            "on the crisis safety path. "
            f"Situation: {situation}\n"
            f"Automatic thought: {automatic_thought}"
        )

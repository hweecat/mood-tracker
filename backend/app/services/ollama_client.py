import json
import time

import httpx

from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_provider import (
    LLMParseError,
    LLMProviderError,
    LLMResult,
    LLMTimeoutError,
    minimize_cbt_request_for_provider,
)


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
        start = time.time()
        url = f"{self.base_url}/api/generate"
        minimized_request = minimize_cbt_request_for_provider(request)
        try:
            response = await self.http_client.post(
                url,
                json={
                    "model": self.model,
                    "prompt": self._build_prompt(minimized_request),
                    "stream": False,
                    "format": "json",
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            payload = response.json()
            parsed = json.loads(payload["response"])
        except httpx.TimeoutException as exc:
            raise LLMTimeoutError("Ollama provider request timed out") from exc
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
        return (
            "Analyze this CBT journal entry. Return JSON with suggestions and reframes. "
            f"Situation: {request.situation}\n"
            f"Automatic thought: {request.automatic_thought}"
        )

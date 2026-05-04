# backend/app/services/ai_client.py

from abc import ABC, abstractmethod
import asyncio
import time
from typing import Optional
from textblob import TextBlob
from app.schemas.cbt import CBTAnalysisRequest, CBTAnalysisResponse
from app.core.logging import get_logger
from app.core.ai_config import get_ai_config
from app.services.llm_orchestrator import LLMOrchestrator
from app.services.llm_provider import (
    LLMParseError,
    LLMProviderError,
    LLMResult,
    LLMTimeoutError,
    LLMSafetyBlocked,
)
from app.services.ollama_client import OllamaClient
from app.services.openai_client import OpenAIClient

logger = get_logger(__name__)

class AIClientProtocol(ABC):
    """Abstract protocol for AI clients."""

    @abstractmethod
    async def analyze_cbt(self, request: CBTAnalysisRequest, user_id: str | None = None) -> CBTAnalysisResponse:
        """Analyze CBT entry for distortions and generate reframes."""
        pass

    @abstractmethod
    async def analyze_mood(self, text: str) -> Optional[dict]:
        """Analyze mood text for sentiment and keywords."""
        pass

class TextBlobClient(AIClientProtocol):
    """TextBlob-based AI client (Phase 1 implementation)."""

    async def analyze_cbt(self, request: CBTAnalysisRequest, user_id: str | None = None) -> CBTAnalysisResponse:
        """TextBlob doesn't support CBT analysis - return empty response."""
        logger.warning("CBT analysis requested on TextBlob client (not supported)")
        return CBTAnalysisResponse(suggestions=[], reframes=[])

    async def analyze_mood(self, text: str) -> Optional[dict]:
        """Analyze mood note using TextBlob."""
        if not text:
            return None

        logger.info("Analyzing mood note", extra={"text_length": len(text)})

        try:
            blob = TextBlob(text)
            sentiment_score = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity
            keywords = list(set(blob.noun_phrases))

            analysis = {
                "sentiment_score": sentiment_score,
                "subjectivity": subjectivity,
                "keywords": keywords
            }

            logger.info("Mood analysis complete", extra={"sentiment_score": sentiment_score})
            return analysis
        except Exception as e:
            logger.error("Mood analysis failed", extra={"error_type": type(e).__name__})
            return None

# Import Gemini client when available
try:
    from app.services.gemini_client import GeminiClient, ParseException, SafetyException
    _gemini_available = True
except ImportError:
    _gemini_available = False
    logger.warning("Gemini client not available, falling back to TextBlob")

class GeminiAdapter(AIClientProtocol):
    """Adapter for the GeminiClient to match the protocol."""
    
    def __init__(self):
        self.client = GeminiClient()

    async def analyze_cbt(self, request: CBTAnalysisRequest, user_id: str | None = None) -> CBTAnalysisResponse:
        return await self.client.analyze_cbt(request, user_id=user_id)

    async def analyze_mood(self, text: str) -> Optional[dict]:
        # Currently, we still use TextBlob for mood analysis as it's faster and sufficient.
        # We could implement a Gemini-based one here if needed.
        tb_client = TextBlobClient()
        return await tb_client.analyze_mood(text)

class GeminiLLMProvider:
    provider = "gemini"

    def __init__(self, model: str):
        self.model = model
        self.client = GeminiClient(model=model)

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> LLMResult:
        start = time.time()
        try:
            distortions, _ = await self.client._detect_distortions_with_retry(
                request.situation,
                request.automatic_thought,
            )
            reframes, action_plans, reframe_prompt_version = await self.client._generate_reframes_and_action_plans_with_retry(
                request.situation,
                request.automatic_thought,
                [item.distortion for item in distortions],
            )
        except SafetyException as exc:
            raise LLMSafetyBlocked(
                exc.message,
                crisis_resources=exc.crisis_resources,
            ) from exc
        except ParseException as exc:
            raise LLMParseError("Gemini response was not valid CBT JSON") from exc
        except asyncio.TimeoutError as exc:
            raise LLMTimeoutError("Gemini request timed out") from exc
        except Exception as exc:
            raise LLMProviderError("Gemini provider request failed") from exc

        return LLMResult(
            provider=self.provider,
            model=self.model,
            raw_payload={},
            parsed_payload={
                "suggestions": [item.model_dump() for item in distortions],
                "reframes": [item.model_dump() for item in reframes],
                "action_plans": [item.model_dump() for item in action_plans],
                "prompt_version": reframe_prompt_version,
            },
            latency_ms=int((time.time() - start) * 1000),
        )


class ProviderOrchestratorAdapter(AIClientProtocol):
    def __init__(self, orchestrator: LLMOrchestrator):
        self.orchestrator = orchestrator
        self.mood_client = TextBlobClient()

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> CBTAnalysisResponse:
        return await self.orchestrator.analyze_cbt(request)

    async def analyze_mood(self, text: str) -> Optional[dict]:
        return await self.mood_client.analyze_mood(text)


def get_ai_client() -> AIClientProtocol:
    """
    Factory function to get the appropriate AI client.

    Returns:
        AIClientProtocol: The configured AI client
    """
    config = get_ai_config()

    if config.enable_gemini:
        providers = _build_cbt_providers(config)
        if providers:
            logger.info(
                "Using provider fallback AI client",
                extra={"providers": [provider.provider for provider in providers]},
            )
            return ProviderOrchestratorAdapter(LLMOrchestrator(providers=providers))

    logger.info("Using TextBlob AI client")
    return TextBlobClient()


def _build_cbt_providers(config) -> list:
    providers = []
    for item in config.cbt_model_chain:
        if item.provider == "gemini":
            if _gemini_available:
                providers.append(GeminiLLMProvider(item.model))
            else:
                logger.warning("Gemini provider requested but SDK is unavailable")
        elif item.provider == "openai":
            if config.openai_api_key:
                providers.append(
                    OpenAIClient(
                        api_key=config.openai_api_key,
                        model=item.model,
                        timeout=config.ai_provider_timeout,
                    )
                )
            else:
                logger.warning("OpenAI provider requested without OPENAI_API_KEY")
        elif item.provider == "ollama":
            providers.append(
                OllamaClient(
                    base_url=config.ollama_base_url,
                    model=item.model,
                    timeout=config.ai_provider_timeout,
                )
            )
    return providers

# Legacy function for backward compatibility
async def analyze_mood_note(text: str) -> dict:
    """Legacy function - use get_ai_client().analyze_mood() instead."""
    client = get_ai_client()
    return await client.analyze_mood(text)

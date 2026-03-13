# backend/app/services/ai_client.py

from abc import ABC, abstractmethod
from typing import Optional, List
from textblob import TextBlob
from app.schemas.cbt import CBTAnalysisRequest, CBTAnalysisResponse
from app.core.logging import get_logger
from app.core.ai_config import get_ai_config

logger = get_logger(__name__)

class AIClientProtocol(ABC):
    """Abstract protocol for AI clients."""

    @abstractmethod
    async def analyze_cbt(self, request: CBTAnalysisRequest) -> CBTAnalysisResponse:
        """Analyze CBT entry for distortions and generate reframes."""
        pass

    @abstractmethod
    async def analyze_mood(self, text: str) -> Optional[dict]:
        """Analyze mood text for sentiment and keywords."""
        pass

class TextBlobClient(AIClientProtocol):
    """TextBlob-based AI client (Phase 1 implementation)."""

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> CBTAnalysisResponse:
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
            logger.error("Mood analysis failed", extra={"error": str(e)})
            return None

# Import Gemini client when available
try:
    from app.services.gemini_client import GeminiClient
    _gemini_available = True
except ImportError:
    _gemini_available = False
    logger.warning("Gemini client not available, falling back to TextBlob")

class GeminiAdapter(AIClientProtocol):
    """Adapter for the GeminiClient to match the protocol."""
    
    def __init__(self):
        self.client = GeminiClient()

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> CBTAnalysisResponse:
        return await self.client.analyze_cbt(request)

    async def analyze_mood(self, text: str) -> Optional[dict]:
        # Currently, we still use TextBlob for mood analysis as it's faster and sufficient.
        # We could implement a Gemini-based one here if needed.
        tb_client = TextBlobClient()
        return await tb_client.analyze_mood(text)

def get_ai_client() -> AIClientProtocol:
    """
    Factory function to get the appropriate AI client.

    Returns:
        AIClientProtocol: The configured AI client
    """
    config = get_ai_config()

    if config.enable_gemini and _gemini_available:
        logger.info("Using Gemini AI client")
        return GeminiAdapter()

    logger.info("Using TextBlob AI client")
    return TextBlobClient()

# Legacy function for backward compatibility
async def analyze_mood_note(text: str) -> dict:
    """Legacy function - use get_ai_client().analyze_mood() instead."""
    client = get_ai_client()
    return await client.analyze_mood(text)

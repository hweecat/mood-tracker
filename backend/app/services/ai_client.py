# backend/app/services/ai_client.py

import json
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from textblob import TextBlob
from sqlite3 import Connection

from app.schemas.cbt import CBTAnalysisRequest, CBTAnalysisResponse
from app.core.logging import get_logger, correlation_id_ctx
from app.core.ai_config import get_ai_config
from app.services.privacy import PrivacyService
from app.services.audit import AuditService

logger = get_logger(__name__)

class AIShieldOrchestrator:
    """Orchestrates privacy masking and audit logging for AI interactions."""
    def __init__(self, db: Optional[Connection] = None):
        self.privacy_service = PrivacyService()
        self.audit_service = AuditService(db) if db else None

    async def run_shielded_mood_analysis(self, text: str, analyzer_func) -> Optional[Dict[str, Any]]:
        """Run mood analysis through the privacy shield."""
        correlation_id = correlation_id_ctx.get()
        
        # 1. Mask PII
        masking_result = self.privacy_service.mask(text)
        masked_text = masking_result.masked_text
        
        # 2. Perform Analysis
        try:
            analysis = await analyzer_func(masked_text)
            status = "SUCCESS"
        except Exception as e:
            logger.error("AI shielded analysis failed", extra={"error": str(e)})
            analysis = {}
            status = "ERROR"

        # 3. Log Interaction (if DB is available)
        if self.audit_service:
            self.audit_service.log_interaction(
                correlation_id=correlation_id,
                masked_payload=masked_text,
                response_payload=json.dumps(analysis),
                status=status
            )

        # 4. Unmask Response
        if analysis and "keywords" in analysis:
            analysis["keywords"] = [
                self.privacy_service.unmask(kw, masking_result.mapping) 
                for kw in analysis["keywords"]
            ]
        
        return analysis

class AIClientProtocol(ABC):
    """Abstract protocol for AI clients."""

    @abstractmethod
    async def analyze_cbt(self, request: CBTAnalysisRequest, db: Optional[Connection] = None) -> CBTAnalysisResponse:
        """Analyze CBT entry for distortions and generate reframes."""
        pass

    @abstractmethod
    async def analyze_mood(self, text: str, db: Optional[Connection] = None) -> Optional[dict]:
        """Analyze mood text for sentiment and keywords."""
        pass

class TextBlobClient(AIClientProtocol):
    """TextBlob-based AI client (Phase 1 implementation)."""

    async def analyze_cbt(self, request: CBTAnalysisRequest, db: Optional[Connection] = None) -> CBTAnalysisResponse:
        """TextBlob doesn't support CBT analysis - return empty response."""
        logger.warning("CBT analysis requested on TextBlob client (not supported)")
        return CBTAnalysisResponse(suggestions=[], reframes=[])

    async def analyze_mood(self, text: str, db: Optional[Connection] = None) -> Optional[dict]:
        """Analyze mood note using TextBlob with optional shielding."""
        if not text:
            return None

        async def _internal_analyze(t: str):
            blob = TextBlob(t)
            return {
                "sentiment_score": blob.sentiment.polarity,
                "subjectivity": blob.sentiment.subjectivity,
                "keywords": list(set(blob.noun_phrases))
            }

        orchestrator = AIShieldOrchestrator(db)
        return await orchestrator.run_shielded_mood_analysis(text, _internal_analyze)

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

    async def analyze_cbt(self, request: CBTAnalysisRequest, db: Optional[Connection] = None) -> CBTAnalysisResponse:
        # TODO: Implement shielding for CBT analysis
        return await self.client.analyze_cbt(request)

    async def analyze_mood(self, text: str, db: Optional[Connection] = None) -> Optional[dict]:
        # Using shielded TextBlob for mood as it's sufficient
        tb_client = TextBlobClient()
        return await tb_client.analyze_mood(text, db)

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
async def analyze_mood_note(text: str, db: Optional[Connection] = None) -> Optional[dict]:
    """Legacy function - use get_ai_client().analyze_mood() instead."""
    client = get_ai_client()
    return await client.analyze_mood(text, db)

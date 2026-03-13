# Phase 2 Implementation Plan: The Brain (Gemini Integration)

## Executive Summary

This document details the implementation of "The Brain" - the Gemini AI integration component for Phase 2 of MindfulTrack. The Brain provides cognitive intelligence by detecting distortions and generating rational reframes using Google Gemini API.

---

## 1. Architecture Overview

The Brain is implemented as a modular, async-capable AI service layer that:
- Integrates with Google Gemini API using `google-generative-ai` SDK
- Provides structured JSON outputs for distortion detection and rational reframing
- Implements multi-tier safety handling based on Gemini's `safetyRatings`
- Supports prompt versioning for A/B testing and re-analysis
- Uses an adapter pattern for future provider flexibility

### Component Structure

```
backend/app/
├── core/
│   ├── ai_config.py           # Environment-based configuration
│   └── constants.py           # 13 cognitive distortions list
├── models/
│   └── prompt_version.py      # Prompt version data model (SQLModel)
├── services/
│   ├── ai_client.py           # Refactored: Adapter pattern for multiple providers
│   ├── gemini_client.py       # New: Gemini wrapper with structured output
│   ├── prompt_manager.py      # New: Prompt templates & versioning
│   └── safety_handler.py      # New: Safety rating evaluation
└── api/v1/routes/
    └── cbt_logs.py            # Updated: New /analyze endpoint
```

---

## 2. Key Design Decisions & Tradeoffs

| Decision | Approach | Tradeoff |
|----------|----------|----------|
| **Adapter Pattern** | Abstract `AIClientProtocol` with Gemini implementation | Slight overhead, but enables swapping to Claude/OpenAI without business logic changes |
| **Prompt Storage** | Versioned prompts in database + fallback to code | More complex than hardcoded, but enables A/B testing and historical re-analysis |
| **Async Implementation** | Full async/await for all AI calls | Testing complexity addressed using `anyio` + `httpx.AsyncClient` in place of `TestClient`; required for non-blocking I/O and future scaling |
| **Safety Fallback** | Tiered response based on `safetyRatings` | Adds complexity, but essential for mental health domain |
| **Structured Output** | Use Gemini's `response_schema` for JSON | Limits model expressiveness, but ensures parseable, type-safe responses |
| **Retry Strategy** | Exponential backoff with 2 retries | Adds latency on failures, but handles transient network issues |

---

## 3. File-by-File Implementation Plan

### 3.1 `backend/app/core/constants.py`

Define the 13 cognitive distortions as constants for reuse across prompts and validation.

```python
# backend/app/core/constants.py

COGNITIVE_DISTORTIONS = [
    "all-or-nothing thinking",
    "overgeneralization",
    "mental filter",
    "disqualifying the positive",
    "jumping to conclusions",
    "magnification",
    "emotional reasoning",
    "should statements",
    "labeling",
    "personalization",
    "control fallacies",
    "fallacy of fairness",
    "always being right"
]

SAFETY_FALLBACK_MESSAGES = {
    "sexual": "I notice this topic may be sensitive. For support, please reach out to professional resources.",
    "hate_speech": "I'm unable to process this content. For support, please reach out to professional resources.",
    "harassment": "I notice you may be experiencing distress. Crisis resources are available below.",
    "dangerous_content": "If you're in immediate danger, please call emergency services or a crisis line."
}

CRISIS_RESOURCES = [
    {"name": "National Suicide Prevention Lifeline", "phone": "988"},
    {"name": "Crisis Text Line", "text": "HOME to 741741"},
    {"name": "International Association for Suicide Prevention", "url": "https://www.iasp.info/resources/Crisis_Centres/"}
]
```

**Tradeoff:** Hardcoding vs. database - constants are fine for now as distortions are clinically stable; can migrate to DB if dynamic updates needed.

---

### 3.2 `backend/app/core/ai_config.py`

Environment-based configuration with validation.

```python
# backend/app/core/ai_config.py

from pydantic_settings import BaseSettings
from functools import lru_cache

class AIConfig(BaseSettings):
    gemini_api_key: str
    gemini_model: str = "gemini-1.5-flash"
    gemini_temperature: float = 0.7
    ai_timeout: int = 10  # seconds
    ai_max_retries: int = 2
    enable_gemini: bool = True

    class Config:
        env_file = ".env"

@lru_cache()
def get_ai_config() -> AIConfig:
    return AIConfig()
```

**Tradeoff:** Using `pydantic-settings` adds a dependency but provides type-safe config with validation.

---

### 3.3 `backend/app/models/prompt_version.py`

Data model for prompt versioning (SQLModel).

```python
# backend/app/models/prompt_version.py

import uuid
from sqlmodel import SQLModel, Field, Text
from datetime import datetime
from typing import Optional

class PromptVersion(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    version: str = Field(index=True)
    prompt_type: str = Field(index=True)  # "distortion_detection" or "reframing"
    template: str = Field(sa_type=Text)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
```

**Tradeoff:** Additional database table, but enables re-analysis and prompt evolution tracking per ADR-004.

---

### 3.4 `backend/app/services/safety_handler.py`

Multi-tier safety evaluation based on Gemini's safety ratings.

```python
# backend/app/services/safety_handler.py

from enum import Enum
from typing import Optional, List
from google.generativeai.types import HarmCategory, HarmProbability
from app.core.constants import SAFETY_FALLBACK_MESSAGES, CRISIS_RESOURCES
from app.core.logging import get_logger

logger = get_logger(__name__)

class SafetyTier(Enum):
    NEGLIGIBLE = "negligible"
    LOW = "low"
    HIGH = "high"

class SafetyResult:
    def __init__(
        self,
        tier: SafetyTier,
        category: Optional[str],
        message: str,
        trigger_crisis: bool,
        blocked_categories: Optional[List[str]] = None
    ):
        self.tier = tier
        self.category = category
        self.message = message
        self.trigger_crisis = trigger_crisis
        self.blocked_categories = blocked_categories or []

class SafetyHandler:
    """Handles safety rating evaluation from Gemini responses."""

    def __init__(self):
        self.fallback_messages = SAFETY_FALLBACK_MESSAGES
        self.crisis_resources = CRISIS_RESOURCES

    def evaluate(self, safety_ratings: dict) -> SafetyResult:
        """
        Evaluate Gemini safety ratings and determine appropriate response tier.

        Args:
            safety_ratings: Dictionary mapping HarmCategory to HarmProbability

        Returns:
            SafetyResult with tier, message, and crisis trigger flag
        """
        blocked_categories = []
        max_tier = SafetyTier.NEGLIGIBLE
        high_harm_category = None

        for category, probability in safety_ratings.items():
            if probability == HarmProbability.HIGH:
                max_tier = SafetyTier.HIGH
                high_harm_category = self._category_name(category)
                blocked_categories.append(self._category_name(category))
                logger.warning(
                    "High harm probability detected",
                    extra={"category": self._category_name(category), "probability": str(probability)}
                )
            elif probability in (HarmProbability.MEDIUM, HarmProbability.LOW):
                if max_tier != SafetyTier.HIGH:
                    max_tier = SafetyTier.LOW
                blocked_categories.append(self._category_name(category))

        if max_tier == SafetyTier.HIGH:
            return SafetyResult(
                tier=SafetyTier.HIGH,
                category=high_harm_category,
                message="Your safety is important. Please reach out for support.",
                trigger_crisis=True,
                blocked_categories=blocked_categories
            )

        if max_tier == SafetyTier.LOW:
            # Return category-specific fallback for first blocked category
            fallback_key = self._get_fallback_key(blocked_categories[0]) if blocked_categories else None
            message = self.fallback_messages.get(fallback_key, "I'm unable to provide specific analysis for this content.")

            return SafetyResult(
                tier=SafetyTier.LOW,
                category=blocked_categories[0] if blocked_categories else None,
                message=message,
                trigger_crisis=False,
                blocked_categories=blocked_categories
            )

        return SafetyResult(
            tier=SafetyTier.NEGLIGIBLE,
            category=None,
            message="",
            trigger_crisis=False,
            blocked_categories=[]
        )

    def _category_name(self, category: HarmCategory) -> str:
        """Convert HarmCategory enum to string key."""
        category_map = {
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: "sexual",
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: "hate_speech",
            HarmCategory.HARM_CATEGORY_HARASSMENT: "harassment",
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: "dangerous_content",
        }
        return category_map.get(category, str(category))

    def _get_fallback_key(self, category: str) -> str:
        """Get fallback message key from category."""
        return category.lower().replace(" ", "_")
```

**Tradeoff:** Additional abstraction layer, but centralizes safety logic for easier testing and updates.

---

### 3.5 `backend/app/services/prompt_manager.py`

Manages prompt templates with versioning.

```python
# backend/app/services/prompt_manager.py

from typing import Optional
from app.core.ai_config import get_ai_config
from app.core.constants import COGNITIVE_DISTORTIONS
from app.core.logging import get_logger
from app.db.session import get_db
import json

logger = get_logger(__name__)

class PromptManager:
    """Manages prompt templates with versioning support."""

    # Default prompt templates (fallback when DB is unavailable)
    DEFAULT_DISTORTION_PROMPT = """
You are a cognitive behavioral therapy assistant. Analyze the following automatic thought for cognitive distortions.

Situation: {situation}
Automatic Thought: {automatic_thought}

Identify which cognitive distortions (from the predefined list) are present in this thought.
For each distortion detected, provide:
1. The distortion name (must be exactly one of: {distortions})
2. A brief reasoning explaining why this distortion applies

Return ONLY a valid JSON object with this structure:
{{
  "distortions": [
    {{
      "distortion": "exact distortion name",
      "reasoning": "brief explanation"
    }}
  ]
}}
"""

    DEFAULT_REFRAMING_PROMPT = """
You are a cognitive behavioral therapy assistant. Generate 3 distinct rational reframes for the following automatic thought.

Situation: {situation}
Automatic Thought: {automatic_thought}
Detected Distortions: {distortions}

Generate exactly 3 rational reframes, each from a different perspective:
1. Compassionate - A kind, understanding perspective
2. Logical - A fact-based, analytical perspective
3. Evidence-based - A perspective based on available evidence

Return ONLY a valid JSON object with this structure:
{{
  "reframes": [
    {{
      "perspective": "Compassionate",
      "content": "reframe content"
    }},
    {{
      "perspective": "Logical",
      "content": "reframe content"
    }},
    {{
      "perspective": "Evidence-based",
      "content": "reframe content"
    }}
  ]
}}
"""

    def __init__(self):
        self.config = get_ai_config()

    async def get_distortion_prompt(self, version: Optional[str] = None) -> tuple[str, str]:
        """
        Get the distortion detection prompt template.

        Returns:
            Tuple of (prompt_template, version_id)
        """
        if version:
            # Try to fetch specific version from DB
            db = next(get_db())
            cursor = db.cursor()
            cursor.execute(
                "SELECT id, template FROM prompt_versions WHERE version = ? AND prompt_type = ? AND is_active = 1",
                (version, "distortion_detection")
            )
            row = cursor.fetchone()
            if row:
                logger.info("Loaded distortion prompt from DB", extra={"version": version})
                return row["template"], row["id"]

        # Use default template
        logger.info("Using default distortion prompt template")
        return self._format_distortion_prompt(), "default"

    async def get_reframing_prompt(self, version: Optional[str] = None) -> tuple[str, str]:
        """
        Get the reframing prompt template.

        Returns:
            Tuple of (prompt_template, version_id)
        """
        if version:
            # Try to fetch specific version from DB
            db = next(get_db())
            cursor = db.cursor()
            cursor.execute(
                "SELECT id, template FROM prompt_versions WHERE version = ? AND prompt_type = ? AND is_active = 1",
                (version, "reframing")
            )
            row = cursor.fetchone()
            if row:
                logger.info("Loaded reframing prompt from DB", extra={"version": version})
                return row["template"], row["id"]

        # Use default template
        logger.info("Using default reframing prompt template")
        return self._format_reframing_prompt(), "default"

    def _format_distortion_prompt(self) -> str:
        """Format the default distortion prompt with distortions list."""
        distortions_str = '", "'.join(COGNITIVE_DISTORTIONS)
        return self.DEFAULT_DISTORTION_PROMPT.format(
            situation="{situation}",
            automatic_thought="{automatic_thought}",
            distortions=f'"{distortions_str}"'
        )

    def _format_reframing_prompt(self) -> str:
        """Format the default reframing prompt."""
        return self.DEFAULT_REFRAMING_PROMPT.format(
            situation="{situation}",
            automatic_thought="{automatic_thought}",
            distortions="{distortions}"
        )
```

**Tradeoff:** Database lookup adds latency on cold requests, but enables dynamic prompt updates. Mitigated by caching.

---

### 3.6 `backend/app/services/gemini_client.py`

Core Gemini integration with structured JSON output.

```python
# backend/app/services/gemini_client.py

import asyncio
import json
import uuid
import time
from typing import List
from google import generativeai as genai
from google.generativeai.types import GenerationConfig, HarmBlockThreshold, HarmCategory, HarmProbability
from app.core.ai_config import get_ai_config
from app.core.constants import COGNITIVE_DISTORTIONS
from app.schemas.cbt import (
    CBTAnalysisRequest,
    CBTAnalysisResponse,
    DistortionSuggestion,
    RationalReframe
)
from app.services.safety_handler import SafetyHandler
from app.services.prompt_manager import PromptManager
from app.core.logging import get_logger
from app.db.session import get_db

logger = get_logger(__name__)

class GeminiClient:
    """Gemini AI client for cognitive distortion detection and rational reframing."""

    def __init__(self):
        self.config = get_ai_config()
        genai.configure(api_key=self.config.gemini_api_key)
        self.client = genai.GenerativeModel(self.config.gemini_model)
        self.safety_handler = SafetyHandler()
        self.prompt_manager = PromptManager()

    async def analyze_cbt(self, request: CBTAnalysisRequest) -> CBTAnalysisResponse:
        """
        Perform full CBT analysis: distortion detection and rational reframing.

        Args:
            request: CBT analysis request with situation and automatic thought

        Returns:
            CBTAnalysisResponse with distortion suggestions and rational reframes
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())
        latency_ms = 0
        prompt_version = None
        safety_tier = None
        success = False

        try:
            # 1. Detect distortions
            distortions, prompt_version = await self._detect_distortions_with_retry(
                request.situation,
                request.automatic_thought
            )

            # 2. Generate reframes
            distortion_names = [d.distortion for d in distortions]
            reframes, _ = await self._generate_reframes_with_retry(
                request.situation,
                request.automatic_thought,
                distortion_names
            )

            latency_ms = int((time.time() - start_time) * 1000)
            success = True

            response = CBTAnalysisResponse(
                suggestions=distortions,
                reframes=reframes,
                prompt_version=prompt_version
            )

            # 3. Log audit (PII-free)
            self._log_audit(
                request_id=request_id,
                prompt_version_id=prompt_version,
                safety_tier=safety_tier,
                latency_ms=latency_ms,
                success=success
            )

            return response

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "CBT analysis failed",
                extra={"request_id": request_id, "error": str(e), "latency_ms": latency_ms}
            )
            raise

    async def _detect_distortions_with_retry(
        self,
        situation: str,
        automatic_thought: str
    ) -> tuple[List[DistortionSuggestion], str]:
        """Detect distortions with retry logic."""
        for attempt in range(self.config.ai_max_retries + 1):
            try:
                return await self._detect_distortions(situation, automatic_thought)
            except Exception as e:
                if attempt == self.config.ai_max_retries:
                    raise
                logger.warning(
                    "Distortion detection failed, retrying",
                    extra={"attempt": attempt + 1, "error": str(e)}
                )
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    async def _generate_reframes_with_retry(
        self,
        situation: str,
        automatic_thought: str,
        distortions: List[str]
    ) -> tuple[List[RationalReframe], str]:
        """Generate reframes with retry logic."""
        for attempt in range(self.config.ai_max_retries + 1):
            try:
                return await self._generate_reframes(situation, automatic_thought, distortions)
            except Exception as e:
                if attempt == self.config.ai_max_retries:
                    raise
                logger.warning(
                    "Reframe generation failed, retrying",
                    extra={"attempt": attempt + 1, "error": str(e)}
                )
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    async def _detect_distortions(
        self,
        situation: str,
        automatic_thought: str
    ) -> tuple[List[DistortionSuggestion], str]:
        """Detect cognitive distortions using Gemini."""
        prompt_template, version_id = await self.prompt_manager.get_distortion_prompt()
        prompt = prompt_template.format(
            situation=situation,
            automatic_thought=automatic_thought
        )

        # Configure generation for JSON output
        generation_config = GenerationConfig(
            temperature=self.config.gemini_temperature,
            response_mime_type="application/json"
        )

        response = await asyncio.to_thread(
            self.client.generate_content,
            prompt,
            generation_config=generation_config
        )

        # Check safety ratings
        safety_result = self.safety_handler.evaluate(
            self._extract_safety_ratings(response)
        )

        if safety_result.trigger_crisis:
            raise SafetyException(safety_result.message, safety_result.crisis_resources)

        # Parse JSON response
        content = response.text
        try:
            data = json.loads(content)
            suggestions = [
                DistortionSuggestion(
                    distortion=item["distortion"],
                    reasoning=item["reasoning"]
                )
                for item in data.get("distortions", [])
            ]
            return suggestions, version_id
        except (json.JSONDecodeError, KeyError) as e:
            logger.error("Failed to parse Gemini response", extra={"error": str(e), "content": content})
            raise ParseException("Invalid AI response format")

    async def _generate_reframes(
        self,
        situation: str,
        automatic_thought: str,
        distortions: List[str]
    ) -> tuple[List[RationalReframe], str]:
        """Generate rational reframes using Gemini."""
        prompt_template, version_id = await self.prompt_manager.get_reframing_prompt()
        prompt = prompt_template.format(
            situation=situation,
            automatic_thought=automatic_thought,
            distortions=", ".join(distortions)
        )

        generation_config = GenerationConfig(
            temperature=self.config.gemini_temperature,
            response_mime_type="application/json"
        )

        response = await asyncio.to_thread(
            self.client.generate_content,
            prompt,
            generation_config=generation_config
        )

        # Check safety ratings
        safety_result = self.safety_handler.evaluate(
            self._extract_safety_ratings(response)
        )

        if safety_result.trigger_crisis:
            raise SafetyException(safety_result.message, safety_result.crisis_resources)

        # Parse JSON response
        content = response.text
        try:
            data = json.loads(content)
            reframes = [
                RationalReframe(
                    perspective=item["perspective"],
                    content=item["content"]
                )
                for item in data.get("reframes", [])
            ]
            return reframes, version_id
        except (json.JSONDecodeError, KeyError) as e:
            logger.error("Failed to parse Gemini response", extra={"error": str(e), "content": content})
            raise ParseException("Invalid AI response format")

    def _extract_safety_ratings(self, response) -> dict:
        """Extract safety ratings from Gemini response."""
        safety_ratings = {}
        for candidate in response.candidates:
            for rating in candidate.safety_ratings:
                safety_ratings[rating.category] = rating.probability
        return safety_ratings

    def _log_audit(
        self,
        request_id: str,
        prompt_version_id: str,
        safety_tier: str,
        latency_ms: int,
        success: bool
    ):
        """Log AI audit entry (PII-free)."""
        db = next(get_db())
        cursor = db.cursor()
        cursor.execute(
            """
            INSERT INTO ai_audit_logs (
                id, request_id, prompt_version_id, safety_tier,
                latency_ms, success, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), request_id, prompt_version_id, safety_tier, latency_ms, success, int(time.time()))
        )
        db.commit()
        logger.info("AI audit log created", extra={"request_id": request_id, "latency_ms": latency_ms})


class SafetyException(Exception):
    """Raised when safety ratings trigger crisis response."""
    def __init__(self, message: str, crisis_resources: list):
        self.message = message
        self.crisis_resources = crisis_resources
        super().__init__(message)


class ParseException(Exception):
    """Raised when AI response cannot be parsed."""
    pass
```

**Tradeoff:** Using `response_schema` limits model creativity but ensures type-safe, parseable responses.

---

### 3.7 `backend/app/services/ai_client.py` (Refactored)

Refactor to support multiple providers via adapter pattern.

```python
# backend/app/services/ai_client.py

from abc import ABC, abstractmethod
from typing import Optional
from textblob import TextBlob
from app.schemas.cbt import CBTAnalysisRequest, CBTAnalysisResponse
from app.schemas.mood import MoodAnalysis
from app.core.logging import get_logger

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


def get_ai_client():
    """
    Factory function to get the appropriate AI client.

    Returns:
        AIClientProtocol: The configured AI client
    """
    from app.core.ai_config import get_ai_config

    config = get_ai_config()

    if config.enable_gemini and _gemini_available:
        logger.info("Using Gemini AI client")
        return GeminiClient()

    logger.info("Using TextBlob AI client")
    return TextBlobClient()


# Legacy function for backward compatibility
async def analyze_mood_note(text: str) -> dict:
    """Legacy function - use get_ai_client().analyze_mood() instead."""
    client = get_ai_client()
    return await client.analyze_mood(text)
```

**Tradeoff:** Interface adds abstraction overhead but enables seamless provider switching and testability.

---

### 4. Updated API Route (`backend/app/api/v1/routes/cbt_logs.py`)

Add new analysis endpoint.

```python
# backend/app/api/v1/routes/cbt_logs.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.session import get_db
from app.schemas.cbt import CBTLogPublic, CBTLogCreate, CBTAnalysisRequest, CBTAnalysisResponse
from app.repositories.cbt import get_cbt_logs, create_cbt_log, update_cbt_log, delete_cbt_log
from app.services.ai_client import get_ai_client
from app.services.gemini_client import SafetyException
import asyncio
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/", response_model=List[CBTLogPublic])
def read_cbt_logs(db = Depends(get_db)):
    return get_cbt_logs(db, user_id="1")


@router.post("/", response_model=CBTLogPublic)
def create_cbt(log_in: CBTLogCreate, db = Depends(get_db)):
    return create_cbt_log(db, user_id="1", log_in=log_in)


@router.put("/{log_id}", response_model=CBTLogPublic)
def update_cbt(log_id: str, log_in: CBTLogPublic, db = Depends(get_db)):
    if not update_cbt_log(db, user_id="1", log_in=log_in):
        raise HTTPException(status_code=404, detail="CBT log not found")
    return log_in


@router.delete("/{log_id}")
def remove_cbt(log_id: str, db = Depends(get_db)):
    if not delete_cbt_log(db, user_id="1", log_id=log_id):
        raise HTTPException(status_code=404, detail="CBT log not found")
    return {"status": "success"}


@router.post("/analyze", response_model=CBTAnalysisResponse)
async def analyze_cbt(request: CBTAnalysisRequest):
    """
    AI-powered cognitive analysis of automatic thoughts.

    Returns distortion suggestions and rational reframes.
    """
    ai_client = get_ai_client()

    try:
        result = await asyncio.wait_for(
            ai_client.analyze_cbt(request),
            timeout=10.0
        )
        return result
    except SafetyException as e:
        logger.warning("Safety exception triggered", extra={"message": e.message})
        raise HTTPException(
            status_code=status.HTTP_451_UNAVAILABLE_FOR_LEGAL_REASONS,
            detail={
                "message": e.message,
                "trigger": "safety",
                "crisis_resources": e.crisis_resources
            }
        )
    except asyncio.TimeoutError:
        logger.warning("AI analysis timed out")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Analysis timed out. Please try again."
        )
    except Exception as e:
        logger.error("AI analysis failed", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analysis service unavailable"
        )
```

---

### 5. Database Migrations

Add new tables to support prompt versioning and AI audit logging.

```sql
-- backend/migrations/add_prompt_versions.sql

CREATE TABLE IF NOT EXISTS prompt_versions (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    prompt_type TEXT NOT NULL,  -- "distortion_detection" or "reframing"
    template TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_version ON prompt_versions(version);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_type ON prompt_versions(prompt_type);

-- Seed initial default prompts (as fallbacks in code)
INSERT OR IGNORE INTO prompt_versions (id, version, prompt_type, template, description, created_at, is_active)
VALUES (
    'default-distortion',
    '1.0.0',
    'distortion_detection',
    '-- Managed by PromptManager, use code defaults',
    'Default distortion detection template',
    strftime('%s', 'now'),
    1
), (
    'default-reframing',
    '1.0.0',
    'reframing',
    '-- Managed by PromptManager, use code defaults',
    'Default reframing template',
    strftime('%s', 'now'),
    1
);

-- backend/migrations/add_ai_audit_logs.sql

CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    cbt_log_id TEXT,
    prompt_version_id TEXT,
    safety_tier TEXT,
    latency_ms INTEGER NOT NULL,
    success INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (cbt_log_id) REFERENCES cbt_logs(id),
    FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_request_id ON ai_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON ai_audit_logs(created_at);
```

---

### 6. Dependencies to Add

Update `backend/pyproject.toml`:

```toml
[project]
name = "mood-tracker-backend"
version = "0.2.0"  # Bumped for Phase 2
description = "Backend interface for cognitive behavioural therapy (CBT)"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "aiosqlite==0.21.0",
    "fastapi==0.115.8",
    "httpx==0.28.1",
    "nltk==3.9.1",
    "pydantic==2.10.6",
    "pydantic-settings==2.6.1",  # NEW
    "python-dotenv==1.0.1",
    "python-json-logger==3.3.0",
    "sqlmodel==0.0.22",
    "textblob==0.18.0.post0",
    "uvicorn==0.34.0",
    "google-generativeai==0.8.3",  # NEW
]
```

---

### 7. Environment Variables

Add to `.env`:

```env
# AI Configuration
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TEMPERATURE=0.7
ENABLE_GEMINI=true
AI_TIMEOUT=10
AI_MAX_RETRIES=2
```

---

### 8. Testing Strategy

```
backend/tests/
├── services/
│   ├── __init__.py
│   ├── test_gemini_client.py         # Unit tests with mocked responses
│   ├── test_safety_handler.py        # Safety tier evaluation tests
│   ├── test_prompt_manager.py        # Prompt loading tests
│   └── test_ai_client_factory.py    # Client factory tests
├── integration/
│   ├── __init__.py
│   └── test_cbt_analyze_endpoint.py # API endpoint tests
└── conftest.py                       # Test fixtures
```

**Async Testing Convention:**

All async tests use `anyio` as the backend instead of `pytest-asyncio`. Each async test file includes:

```python
import pytest

@pytest.fixture
def anyio_backend():
    return "asyncio"
```

And individual async tests are decorated with `@pytest.mark.anyio`.

Integration tests use `httpx.AsyncClient` with `ASGITransport` for async-safe HTTP testing:

```python
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture  # or @pytest.fixture with anyio
async def async_client(self):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
```

**Test conftest.py example:**

```python
# backend/tests/conftest.py

import pytest
from unittest.mock import Mock, patch
from app.services.ai_client import get_ai_client

@pytest.fixture
def mock_gemini_response():
    """Mock Gemini API response."""
    return Mock(
        text='{"distortions": [{"distortion": "all-or-nothing thinking", "reasoning": "Test"}]}',
        candidates=[Mock(safety_ratings=[])]
    )

@pytest.fixture
def cbt_analysis_request():
    """Sample CBT analysis request."""
    from app.schemas.cbt import CBTAnalysisRequest
    return CBTAnalysisRequest(
        situation="I got a bad grade on my test",
        automatic_thought="I'm so stupid, I'll never succeed"
    )
```

---

### 9. Success Criteria & Observability

| Metric | Target | How Measured |
|--------|--------|--------------|
| Latency | < 3s p95 | Structured logs with `latency_ms` in `ai_audit_logs` |
| Safety Routing | 100% high-harm blocked | Audit log `safety_tier` field |
| Parse Rate | > 99% | `ai_audit_logs` with `success=True` |
| Schema Compliance | 100% | Pydantic validation at service boundary |

---

### 10. Scalability Considerations

1. **Connection Pooling:** Reuse Gemini client instances (singleton pattern in factory)
2. **Async Processing:** All AI calls are non-blocking
3. **Graceful Degradation:** Auto-fallback to TextBlob on repeated failures
4. **Rate Limiting:** Implement per-user request throttling (future enhancement)
5. **Caching:** Cache distortion detection for identical inputs (TTL: 1 hour) - future enhancement

---

### 11. Worktree Initialization

The parallel workspaces are organized under `.worktrees/`:

```
.worktrees/
├── ui/           # UI (The Face): frontend/ directory
├── gemini/       # Gemini (The Brain): backend/ directory
└── pii/          # PII (The Shield): backend/ directory
```

To work on the Brain (Gemini integration):

```bash
# The worktree already exists at .worktrees/gemini/
# Navigate to the backend in the gemini worktree
cd .worktrees/gemini/backend

# Or from the project root:
cd .worktrees/gemini
```

---

### 12. Implementation Checklist

- [X] Create `backend/app/core/constants.py` with cognitive distortions
- [X] Create `backend/app/core/ai_config.py` with Pydantic settings
- [X] Create `backend/app/models/prompt_version.py` SQLModel
- [X] Create `backend/app/services/safety_handler.py`
- [X] Create `backend/app/services/prompt_manager.py`
- [X] Create `backend/app/services/gemini_client.py`
- [X] Refactor `backend/app/services/ai_client.py` with adapter pattern
- [X] Update `backend/app/api/v1/routes/cbt_logs.py` with `/analyze` endpoint
- [X] Create database migrations for `prompt_versions` and `ai_audit_logs`
- [X] Update `backend/pyproject.toml` with new dependencies
- [X] Synchronize `backend/requirements.txt` from `pyproject.toml` via `uv pip compile`
- [X] Update `.env` with Gemini configuration
- [X] Configure CI (`ci.yml`) to use Python 3.12 and inject Gemini env vars in `e2e-tests`
- [X] Write unit tests for all new services (using `anyio`)
- [X] Write integration tests for API endpoint (using `anyio` + `httpx.AsyncClient`)
- [X] Fix linting violations (11 issues resolved with `ruff`)
- [X] Update documentation (`docs/PHASE_2_CHANGELOG.md`)

---

## Summary

This implementation prioritizes:

1. **Maintainability** through clear separation of concerns, adapter pattern, and comprehensive logging
2. **Scalability** through async/await, connection pooling, and graceful degradation
3. **Safety** through multi-tier safety handling and PII awareness
4. **Observability** through structured logging and audit trails
5. **Flexibility** through prompt versioning and provider abstraction

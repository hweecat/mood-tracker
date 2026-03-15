# backend/app/services/gemini_client.py

import asyncio
import json
import uuid
import time
from typing import List, Tuple, Dict
from google import generativeai as genai
from google.generativeai.types import GenerationConfig, HarmCategory, HarmProbability
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
        # Initialize the SDK
        if self.config.gemini_api_key:
            genai.configure(api_key=self.config.gemini_api_key)
        self.model = genai.GenerativeModel(self.config.gemini_model)
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
        prompt_version = "unknown"
        success = False

        try:
            # 1. Detect distortions
            distortions, version_id = await self._detect_distortions_with_retry(
                request.situation,
                request.automatic_thought
            )
            prompt_version = version_id

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

            # 3. Log audit (PII-free) - Async fire and forget would be better but simple call for now
            self._log_audit(
                request_id=request_id,
                prompt_version_id=prompt_version,
                safety_tier="negligible", # Will be updated if exceptions occur
                latency_ms=latency_ms,
                success=success
            )

            return response

        except SafetyException:
            latency_ms = int((time.time() - start_time) * 1000)
            self._log_audit(
                request_id=request_id,
                prompt_version_id=prompt_version,
                safety_tier="high",
                latency_ms=latency_ms,
                success=False
            )
            raise
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "CBT analysis failed",
                extra={"request_id": request_id, "error": str(e), "latency_ms": latency_ms}
            )
            self._log_audit(
                request_id=request_id,
                prompt_version_id=prompt_version,
                safety_tier="error",
                latency_ms=latency_ms,
                success=False
            )
            raise

    async def _detect_distortions_with_retry(
        self,
        situation: str,
        automatic_thought: str
    ) -> Tuple[List[DistortionSuggestion], str]:
        """Detect distortions with retry logic."""
        for attempt in range(self.config.ai_max_retries + 1):
            try:
                return await self._detect_distortions(situation, automatic_thought)
            except (ParseException, SafetyException):
                # Don't retry on parsing or safety errors
                raise
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
    ) -> Tuple[List[RationalReframe], str]:
        """Generate reframes with retry logic."""
        for attempt in range(self.config.ai_max_retries + 1):
            try:
                return await self._generate_reframes(situation, automatic_thought, distortions)
            except (ParseException, SafetyException):
                raise
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
    ) -> Tuple[List[DistortionSuggestion], str]:
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

        # Run in thread pool to avoid blocking async loop if SDK is synchronous
        response = await asyncio.to_thread(
            self.model.generate_content,
            prompt,
            generation_config=generation_config
        )

        # Check safety ratings
        safety_ratings = self._extract_safety_ratings(response)
        safety_result = self.safety_handler.evaluate(safety_ratings)

        if safety_result.trigger_crisis:
            raise SafetyException(safety_result.message, safety_result.crisis_resources)

        # Parse JSON response
        try:
            logger.debug("Gemini response content", extra={"content": response.text})
            data = json.loads(response.text)
            suggestions = []
            for item in data.get("distortions", []):
                distortion_name = item.get("distortion")
                # Filter to ensure only predefined distortions are returned
                if distortion_name in COGNITIVE_DISTORTIONS:
                    suggestions.append(DistortionSuggestion(
                        distortion=distortion_name,
                        reasoning=item.get("reasoning", "No reasoning provided")
                    ))
                else:
                    logger.warning(
                        "AI returned unknown distortion",
                        extra={"unknown_distortion": distortion_name}
                    )
            
            return suggestions, version_id
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error("Failed to parse Gemini response", extra={"error": str(e), "content": response.text})
            raise ParseException("Invalid AI response format")

    async def _generate_reframes(
        self,
        situation: str,
        automatic_thought: str,
        distortions: List[str]
    ) -> Tuple[List[RationalReframe], str]:
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
            self.model.generate_content,
            prompt,
            generation_config=generation_config
        )

        # Check safety ratings
        safety_ratings = self._extract_safety_ratings(response)
        safety_result = self.safety_handler.evaluate(safety_ratings)

        if safety_result.trigger_crisis:
            raise SafetyException(safety_result.message, safety_result.crisis_resources)

        # Parse JSON response
        try:
            data = json.loads(response.text)
            reframes = [
                RationalReframe(
                    perspective=item["perspective"],
                    content=item["content"]
                )
                for item in data.get("reframes", [])
            ]
            return reframes, version_id
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error("Failed to parse Gemini response", extra={"error": str(e), "content": response.text})
            raise ParseException("Invalid AI response format")

    def _extract_safety_ratings(self, response) -> Dict[HarmCategory, HarmProbability]:
        """Extract safety ratings from Gemini response."""
        safety_ratings = {}
        # Gemini SDK returns safety_ratings on candidates or on the response itself depending on version
        if hasattr(response, 'candidates') and response.candidates:
            for rating in response.candidates[0].safety_ratings:
                safety_ratings[rating.category] = rating.probability
        elif hasattr(response, 'prompt_feedback') and hasattr(response.prompt_feedback, 'safety_ratings'):
             for rating in response.prompt_feedback.safety_ratings:
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
        db_gen = get_db()
        try:
            db = next(db_gen)
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO ai_audit_logs (
                    id, request_id, prompt_version_id, safety_tier,
                    latency_ms, success, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (str(uuid.uuid4()), request_id, prompt_version_id, safety_tier, latency_ms, 1 if success else 0, int(time.time()))
            )
            db.commit()
            logger.info("AI audit log created", extra={"request_id": request_id, "latency_ms": latency_ms})
        except Exception as e:
            logger.error("Failed to create AI audit log", extra={"error": str(e)})
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass


class SafetyException(Exception):
    """Raised when safety ratings trigger crisis response."""
    def __init__(self, message: str, crisis_resources: List[dict]):
        self.message = message
        self.crisis_resources = crisis_resources
        super().__init__(message)


class ParseException(Exception):
    """Raised when AI response cannot be parsed."""
    pass

# backend/app/services/safety_handler.py

from enum import Enum
from typing import Optional, List, Dict
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
        blocked_categories: Optional[List[str]] = None,
        crisis_resources: Optional[List[dict]] = None
    ):
        self.tier = tier
        self.category = category
        self.message = message
        self.trigger_crisis = trigger_crisis
        self.blocked_categories = blocked_categories or []
        self.crisis_resources = crisis_resources or []

class SafetyHandler:
    """Handles safety rating evaluation from Gemini responses."""

    def __init__(self):
        self.fallback_messages = SAFETY_FALLBACK_MESSAGES
        self.crisis_resources = CRISIS_RESOURCES

    def evaluate(self, safety_ratings: Dict[HarmCategory, HarmProbability]) -> SafetyResult:
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
                blocked_categories=blocked_categories,
                crisis_resources=self.crisis_resources
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

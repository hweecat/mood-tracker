# backend/tests/services/test_safety_handler.py

import pytest
from google.generativeai.types import HarmCategory, HarmProbability
from app.services.safety_handler import SafetyHandler, SafetyTier


class TestSafetyHandler:
    """Tests for SafetyHandler safety tier evaluation."""

    def test_evaluate_negligible_safety(self):
        """Test evaluation returns NEGLIGIBLE tier for empty safety ratings."""
        handler = SafetyHandler()
        safety_ratings = {}

        result = handler.evaluate(safety_ratings)

        assert result.tier == SafetyTier.NEGLIGIBLE
        assert result.category is None
        assert result.message == ""
        assert result.trigger_crisis is False
        assert result.blocked_categories == []

    def test_evaluate_high_harm_triggers_crisis(self):
        """Test HIGH harm probability triggers crisis response."""
        handler = SafetyHandler()
        safety_ratings = {
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmProbability.HIGH
        }

        result = handler.evaluate(safety_ratings)

        assert result.tier == SafetyTier.HIGH
        assert result.category == "dangerous_content"
        assert result.trigger_crisis is True
        assert "dangerous_content" in result.blocked_categories
        assert len(result.crisis_resources) > 0

    def test_evaluate_low_harm_returns_fallback(self):
        """Test LOW/MEDIUM harm probability returns category-specific fallback."""
        handler = SafetyHandler()
        safety_ratings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmProbability.LOW
        }

        result = handler.evaluate(safety_ratings)

        assert result.tier == SafetyTier.LOW
        assert result.category == "harassment"
        assert result.trigger_crisis is False
        assert "harassment" in result.blocked_categories
        assert "distress" in result.message.lower()

    def test_category_name_mapping(self):
        """Test HarmCategory enum to string key mapping."""
        handler = SafetyHandler()

        assert handler._category_name(HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT) == "sexual"
        assert handler._category_name(HarmCategory.HARM_CATEGORY_HATE_SPEECH) == "hate_speech"
        assert handler._category_name(HarmCategory.HARM_CATEGORY_HARASSMENT) == "harassment"
        assert handler._category_name(HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT) == "dangerous_content"

    def test_get_fallback_key_normalization(self):
        """Test category string normalization for fallback key lookup."""
        handler = SafetyHandler()

        assert handler._get_fallback_key("Sexual Content") == "sexual_content"
        assert handler._get_fallback_key("Harassment") == "harassment"

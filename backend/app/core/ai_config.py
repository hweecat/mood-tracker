# backend/app/core/ai_config.py
"""
AI Configuration Management

This module provides environment-based configuration for AI services.
Uses Pydantic Settings for type-safe configuration with validation.
"""

from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AIConfig(BaseSettings):
    """
    Configuration for AI services.

    Attributes:
        gemini_api_key: Google Gemini API key
        gemini_model: Model name to use for Gemini (default: gemini-1.5-flash)
        gemini_temperature: Temperature for model generation (0.0-1.0)
        ai_timeout: Timeout in seconds for AI requests
        ai_max_retries: Maximum number of retries for failed requests
        enable_gemini: Whether to use Gemini (true) or fall back to TextBlob (false)
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    gemini_api_key: str = Field(..., description="Google Gemini API key")
    gemini_model: str = "gemini-1.5-flash"
    gemini_temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    ai_timeout: int = Field(default=10, gt=0, description="AI request timeout in seconds")
    ai_max_retries: int = Field(default=2, ge=0, description="Max retry attempts for AI requests")
    enable_gemini: bool = True


@lru_cache()
def get_ai_config() -> AIConfig:
    """
    Get cached AI configuration.

    The configuration is cached to avoid repeated environment variable lookups.
    The cache can be cleared by calling get_ai_config.cache_clear() if needed.

    Returns:
        AIConfig: The current AI configuration
    """
    return AIConfig()
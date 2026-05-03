# backend/app/core/ai_config.py
"""
AI Configuration Management

This module provides environment-based configuration for AI services.
Uses Pydantic Settings for type-safe configuration with validation.
"""

from dataclasses import dataclass
from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


@dataclass(frozen=True)
class ProviderModel:
    provider: str
    model: str


SUPPORTED_CBT_PROVIDERS = {"gemini", "openai", "ollama"}


def parse_model_chain(chain: str) -> list[ProviderModel]:
    provider_models: list[ProviderModel] = []
    for raw_item in chain.split(","):
        item = raw_item.strip()
        if not item:
            continue
        if ":" not in item:
            raise ValueError("Model chain items must use provider:model")
        provider, model = [part.strip() for part in item.split(":", 1)]
        if provider not in SUPPORTED_CBT_PROVIDERS:
            raise ValueError(f"unknown provider: {provider}")
        if not model:
            raise ValueError("Model chain items must use provider:model")
        provider_models.append(ProviderModel(provider=provider, model=model))
    if not provider_models:
        raise ValueError("Model chain must include at least one provider:model item")
    return provider_models


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
    ai_cbt_model_chain: str = "gemini:gemini-1.5-flash"
    openai_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"
    ai_provider_timeout: int = Field(default=10, gt=0)

    @property
    def cbt_model_chain(self) -> list[ProviderModel]:
        return parse_model_chain(self.ai_cbt_model_chain)


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

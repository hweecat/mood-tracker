import pytest
from pydantic import ValidationError

from app.core.ai_config import AIConfig, ProviderModel, parse_model_chain


def test_parse_model_chain_returns_ordered_provider_models():
    chain = parse_model_chain("gemini:gemini-1.5-flash,openai:gpt-5.5,ollama:llama3.1")

    assert [item.provider for item in chain] == ["gemini", "openai", "ollama"]
    assert chain[1].model == "gpt-5.5"


def test_parse_model_chain_rejects_unknown_provider():
    with pytest.raises(ValueError, match="unknown provider"):
        parse_model_chain("unknown:model")


def test_parse_model_chain_rejects_missing_model():
    with pytest.raises(ValueError, match="provider:model"):
        parse_model_chain("openai:")


def test_ai_config_exposes_provider_fallback_settings(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai")
    monkeypatch.setenv("AI_CBT_MODEL_CHAIN", "openai:gpt-5.5,ollama:llama3.1")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("AI_PROVIDER_TIMEOUT", "7")

    config = AIConfig()

    assert config.openai_api_key == "test-openai"
    assert config.ollama_base_url == "http://localhost:11434"
    assert config.ai_provider_timeout == 7
    assert config.cbt_model_chain == [
        ProviderModel(provider="openai", model="gpt-5.5"),
        ProviderModel(provider="ollama", model="llama3.1"),
    ]


@pytest.mark.parametrize("chain", ["ollama:llama3", "openai:gpt-5.5"])
def test_ai_config_allows_non_gemini_chain_without_gemini_api_key(monkeypatch, chain):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("AI_CBT_MODEL_CHAIN", chain)

    config = AIConfig(_env_file=None)

    assert config.gemini_api_key is None
    assert config.cbt_model_chain[0].provider == chain.split(":", 1)[0]


def test_ai_config_requires_gemini_api_key_when_chain_uses_gemini(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("AI_CBT_MODEL_CHAIN", "openai:gpt-5.5,gemini:gemini-1.5-flash")

    with pytest.raises(ValidationError, match="GEMINI_API_KEY is required"):
        AIConfig(_env_file=None)


def test_ai_config_rejects_non_positive_provider_timeout(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini")
    monkeypatch.setenv("AI_PROVIDER_TIMEOUT", "0")

    with pytest.raises(ValidationError, match="greater than 0"):
        AIConfig()

import pytest

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

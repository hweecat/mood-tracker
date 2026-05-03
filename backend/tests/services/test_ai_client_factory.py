# backend/tests/services/test_ai_client_factory.py

import logging
from unittest.mock import patch
import pytest
from app.core.ai_config import ProviderModel
from app.services.ai_client import (
    ProviderOrchestratorAdapter,
    TextBlobClient,
    get_ai_client,
)

class TestAIClientFactory:
    """Tests for the AI client factory logic (get_ai_client)."""

    def test_get_ai_client_returns_provider_orchestrator_for_configured_chain(self):
        """Test factory returns provider orchestrator for CBT fallback chains."""
        with patch('app.services.ai_client.get_ai_config') as mock_config, \
             patch('app.services.ai_client._gemini_available', True), \
             patch('app.services.ai_client.GeminiLLMProvider') as mock_gemini_provider, \
             patch('app.services.ai_client.OpenAIClient') as mock_openai_client, \
             patch('app.services.ai_client.OllamaClient') as mock_ollama_client:

            mock_config.return_value.enable_gemini = True
            mock_config.return_value.cbt_model_chain = [
                ProviderModel(provider="gemini", model="gemini-1.5-flash"),
                ProviderModel(provider="openai", model="gpt-5.5"),
                ProviderModel(provider="ollama", model="llama3.1"),
            ]
            mock_config.return_value.openai_api_key = "test-openai"
            mock_config.return_value.ollama_base_url = "http://localhost:11434"
            mock_config.return_value.ai_provider_timeout = 7

            client = get_ai_client()

            assert isinstance(client, ProviderOrchestratorAdapter)
            assert len(client.orchestrator.providers) == 3
            mock_gemini_provider.assert_called_once_with("gemini-1.5-flash")
            mock_openai_client.assert_called_once_with(
                api_key="test-openai",
                model="gpt-5.5",
                timeout=7,
            )
            mock_ollama_client.assert_called_once_with(
                base_url="http://localhost:11434",
                model="llama3.1",
                timeout=7,
            )

    def test_get_ai_client_returns_textblob_when_disabled(self):
        """Test factory returns TextBlobClient when enable_gemini is False."""
        with patch('app.services.ai_client.get_ai_config') as mock_config, \
             patch('app.services.ai_client._gemini_available', True):
            
            mock_config.return_value.enable_gemini = False

            client = get_ai_client()
            assert isinstance(client, TextBlobClient)

    def test_get_ai_client_falls_back_when_gemini_not_available(self):
        """Test factory falls back to TextBlob if Gemini library is missing."""
        with patch('app.services.ai_client.get_ai_config') as mock_config, \
             patch('app.services.ai_client._gemini_available', False):
            
            mock_config.return_value.enable_gemini = True
            mock_config.return_value.cbt_model_chain = [
                ProviderModel(provider="gemini", model="gemini-1.5-flash")
            ]

            client = get_ai_client()
            assert isinstance(client, TextBlobClient)

    @pytest.mark.anyio
    async def test_textblob_mood_failure_logs_exception_type_without_raw_text(self, caplog):
        """Mood analysis logs should not persist raw exception messages that may include note text."""
        client = TextBlobClient()

        with patch("app.services.ai_client.TextBlob", side_effect=RuntimeError("echoed jane@example.com")), \
             caplog.at_level(logging.ERROR):
            result = await client.analyze_mood("jane@example.com feels overwhelmed")

        assert result is None
        records = [
            record for record in caplog.records
            if record.message == "Mood analysis failed"
        ]
        assert len(records) == 1
        assert records[0].error_type == "RuntimeError"
        assert "jane@example.com" not in str(records[0].__dict__)

# backend/tests/services/test_ai_client_factory.py

import pytest
from unittest.mock import patch, MagicMock
from app.services.ai_client import get_ai_client, TextBlobClient, GeminiAdapter

class TestAIClientFactory:
    """Tests for the AI client factory logic (get_ai_client)."""

    def test_get_ai_client_returns_gemini_when_enabled(self):
        """Test factory returns GeminiAdapter when enable_gemini is True."""
        with patch('app.services.ai_client.get_ai_config') as mock_config, \
             patch('app.services.ai_client._gemini_available', True):
            
            mock_config.return_value.enable_gemini = True
            
            # We mock GeminiClient to avoid initializing the actual SDK
            with patch('app.services.ai_client.GeminiClient'):
                client = get_ai_client()
                assert isinstance(client, GeminiAdapter)

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
            
            client = get_ai_client()
            assert isinstance(client, TextBlobClient)

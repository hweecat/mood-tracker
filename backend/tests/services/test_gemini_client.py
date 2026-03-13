# backend/tests/services/test_gemini_client.py

import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from app.services.gemini_client import GeminiClient, SafetyException, ParseException
from app.schemas.cbt import CBTAnalysisRequest, CBTAnalysisResponse, DistortionSuggestion, RationalReframe
from google.generativeai.types import HarmProbability


@pytest.fixture
def anyio_backend():
    return "asyncio"


class TestGeminiClient:
    """Tests for GeminiClient CBT analysis."""

    def test_init_creates_client(self):
        """Test GeminiClient initializes with config and client."""
        with patch('app.services.gemini_client.get_ai_config') as mock_config, \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel') as mock_model:

            mock_config.return_value.gemini_model = "gemini-1.5-flash"
            client = GeminiClient()

            assert client.model is not None
            mock_model.assert_called_once()

    @pytest.mark.anyio
    async def test_analyze_cbt_success(self):
        """Test successful CBT analysis returns suggestions and reframes."""
        with patch('app.services.gemini_client.get_ai_config'), \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel'):

            client = GeminiClient()

            # Mock the private methods
            with patch.object(client, '_detect_distortions_with_retry') as mock_detect, \
                 patch.object(client, '_generate_reframes_with_retry') as mock_reframe, \
                 patch.object(client, '_log_audit') as mock_audit:

                mock_detect.return_value = (
                    [DistortionSuggestion(distortion="all-or-nothing thinking", reasoning="Test reasoning")],
                    "v1.0"
                )
                mock_reframe.return_value = (
                    [RationalReframe(perspective="Compassionate", content="Test reframe")],
                    "v1.0"
                )

                request = CBTAnalysisRequest(
                    situation="Test situation",
                    automatic_thought="Test thought"
                )
                result = await client.analyze_cbt(request)

                assert isinstance(result, CBTAnalysisResponse)
                assert len(result.suggestions) == 1
                assert len(result.reframes) == 1
                assert result.prompt_version == "v1.0"
                mock_audit.assert_called_once()

    @pytest.mark.anyio
    async def test_detect_distortions_filters_unknown_distortions(self):
        """Test that distortions not in COGNITIVE_DISTORTIONS are filtered or handled."""
        from app.core.constants import COGNITIVE_DISTORTIONS
        
        with patch('app.services.gemini_client.get_ai_config'), \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel'):

            client = GeminiClient()
            
            # Mock Gemini response with one valid and one invalid distortion
            mock_response = Mock()
            valid_distortion = COGNITIVE_DISTORTIONS[0]
            mock_response.text = json.dumps({
                "distortions": [
                    {"distortion": valid_distortion, "reasoning": "valid"},
                    {"distortion": "Unknown Distortion", "reasoning": "invalid"}
                ]
            })
            mock_candidate = Mock()
            mock_candidate.safety_ratings = []
            mock_response.candidates = [mock_candidate]

            # Mock PromptManager to return simple prompt
            client.prompt_manager.get_distortion_prompt = AsyncMock(return_value=("simple prompt", "default"))

            with patch('asyncio.to_thread', return_value=mock_response):
                # We need to decide if the implementation SHOULD filter. 
                # Current implementation just takes what Gemini gives. 
                # This test will likely FAIL until we implement filtering.
                suggestions, _ = await client._detect_distortions("situation", "thought")
                
                distortion_names = [s.distortion for s in suggestions]
                assert valid_distortion in distortion_names
                # Behavioral Requirement: Only valid distortions allowed
                assert "Unknown Distortion" not in distortion_names

    @pytest.mark.anyio
    async def test_analyze_cbt_logs_accurate_metadata(self):
        """Test that audit logs capture correct metadata."""
        with patch('app.services.gemini_client.get_ai_config'), \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel'):

            client = GeminiClient()

            with patch.object(client, '_detect_distortions_with_retry') as mock_detect, \
                 patch.object(client, '_generate_reframes_with_retry') as mock_reframe, \
                 patch.object(client, '_log_audit') as mock_audit:

                mock_detect.return_value = ([], "v1.2.3")
                mock_reframe.return_value = ([], "v1.2.3")

                request = CBTAnalysisRequest(situation="s", automatic_thought="t")
                await client.analyze_cbt(request)

                # Check the call arguments of _log_audit
                args, kwargs = mock_audit.call_args
                assert kwargs["prompt_version_id"] == "v1.2.3"
                assert kwargs["success"] is True
                assert kwargs["latency_ms"] >= 0
                assert "request_id" in kwargs

    @pytest.mark.anyio
    async def test_detect_distortions_with_retry_logic(self):
        """Test that distortion detection retries on generic exceptions but not on ParseException."""
        with patch('app.services.gemini_client.get_ai_config') as mock_config, \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel'):

            mock_config.return_value.ai_max_retries = 1
            client = GeminiClient()

            with patch.object(client, '_detect_distortions') as mock_detect, \
                 patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
                
                # Case 1: Generic Exception (should retry)
                mock_detect.side_effect = [Exception("Transient error"), ([], "v1")]
                await client._detect_distortions_with_retry("s", "t")
                assert mock_detect.call_count == 2
                mock_sleep.assert_awaited_once()
                
                # Case 2: ParseException (should NOT retry)
                mock_detect.reset_mock()
                mock_detect.side_effect = ParseException("Parsing error")
                with pytest.raises(ParseException):
                    await client._detect_distortions_with_retry("s", "t")
                assert mock_detect.call_count == 1

    @pytest.mark.anyio
    async def test_detect_distortions_safety_high_triggers_exception(self):
        """Test HIGH safety rating triggers SafetyException."""
        from google.generativeai.types import HarmCategory

        with patch('app.services.gemini_client.get_ai_config'), \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel'):

            client = GeminiClient()

            # Mock the Gemini response
            mock_response = Mock()
            mock_response.text = '{"distortions": []}'
            mock_candidate = Mock()
            mock_rating = Mock()
            mock_rating.category = HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT
            mock_rating.probability = HarmProbability.HIGH
            mock_candidate.safety_ratings = [mock_rating]
            mock_response.candidates = [mock_candidate]

            # Mock PromptManager to return simple prompt
            client.prompt_manager.get_distortion_prompt = AsyncMock(return_value=("simple prompt", "default"))

            with patch('asyncio.to_thread', return_value=mock_response):
                with pytest.raises(SafetyException) as exc_info:
                    await client._detect_distortions("situation", "thought")

                assert len(exc_info.value.crisis_resources) > 0

    @pytest.mark.anyio
    async def test_detect_distortions_invalid_json_raises_parse_exception(self):
        """Test invalid JSON response raises ParseException."""
        from google.generativeai.types import HarmCategory

        with patch('app.services.gemini_client.get_ai_config'), \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel'):

            client = GeminiClient()

            # Mock the Gemini response with invalid JSON
            mock_response = Mock()
            mock_response.text = 'not valid json'
            mock_candidate = Mock()
            mock_rating = Mock()
            mock_rating.category = HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT
            mock_rating.probability = HarmProbability.NEGLIGIBLE
            mock_candidate.safety_ratings = [mock_rating]
            mock_response.candidates = [mock_candidate]

            # Mock PromptManager to return simple prompt
            client.prompt_manager.get_distortion_prompt = AsyncMock(return_value=("simple prompt", "default"))

            with patch('asyncio.to_thread', return_value=mock_response):
                with pytest.raises(ParseException, match="Invalid AI response format"):
                    await client._detect_distortions("situation", "thought")

    def test_extract_safety_ratings_from_candidates(self):
        """Test safety ratings extraction from response candidates."""
        with patch('app.services.gemini_client.get_ai_config'), \
             patch('app.services.gemini_client.genai.configure'), \
             patch('app.services.gemini_client.genai.GenerativeModel'):

            client = GeminiClient()
            mock_response = Mock()
            mock_rating = Mock()
            mock_rating.category = "test_cat"
            mock_rating.probability = HarmProbability.HIGH
            mock_candidate = Mock()
            mock_candidate.safety_ratings = [mock_rating]
            mock_response.candidates = [mock_candidate]

            ratings = client._extract_safety_ratings(mock_response)
            assert ratings["test_cat"] == HarmProbability.HIGH

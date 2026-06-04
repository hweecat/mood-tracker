from unittest.mock import patch

import pytest

from app.schemas.cbt import CBTAnalysisRequest, DistortionSuggestion, RationalReframe
from app.services.gemini_client import GeminiClient, ParseException, SafetyException


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_gemini_analyze_cbt_records_provider_metadata_through_audit_service():
    with patch("app.services.gemini_client.get_ai_config") as mock_config, \
         patch("app.services.gemini_client.genai.configure"), \
         patch("app.services.gemini_client.genai.GenerativeModel"), \
         patch("app.services.prompt_manager.get_ai_config") as mock_prompt_config:

        mock_config.return_value.gemini_api_key = "test-key"
        mock_config.return_value.gemini_model = "gemini-1.5-flash"
        mock_prompt_config.return_value.gemini_api_key = "test-key"
        mock_prompt_config.return_value.gemini_model = "gemini-1.5-flash"
        client = GeminiClient()

        with patch.object(client, "_detect_distortions_with_retry") as mock_detect, \
             patch.object(client, "_generate_reframes_with_retry") as mock_reframe, \
             patch("app.services.gemini_client.ai_audit_service.record_ai_audit_log") as mock_record:

            mock_record.return_value = "audit-reframe-1"
            mock_detect.return_value = (
                [
                    DistortionSuggestion(
                        distortion="All-or-Nothing Thinking",
                        reasoning="The thought uses absolute language.",
                    )
                ],
                "cbt-detect-v1",
            )
            mock_reframe.return_value = (
                [
                    RationalReframe(
                        perspective="Compassionate",
                        content="One difficult moment does not define you.",
                    )
                ],
                "cbt-reframe-v1",
            )

            result = await client.analyze_cbt(
                CBTAnalysisRequest(
                    situation="A private situation",
                    automatic_thought="A private automatic thought",
                )
            )

    audit_in = mock_record.call_args.args[0]
    assert result.ai_analysis_id == "audit-reframe-1"
    assert audit_in.provider == "gemini"
    assert audit_in.model == "gemini-1.5-flash"
    assert audit_in.operation == "generate_reframes"
    assert audit_in.prompt_version_id == "cbt-reframe-v1"
    assert audit_in.status == "success"
    assert audit_in.safety_tier == "negligible"
    assert audit_in.latency_ms >= 0
    assert audit_in.masked_request_payload == {
        "automatic_thought_length": 27,
        "situation_length": 19,
    }
    assert audit_in.response_payload == {
        "suggestions": [
            {
                "distortion": "All-or-Nothing Thinking",
                "reasoning": "The thought uses absolute language.",
            }
        ],
        "reframes": [
            {
                "perspective": "Compassionate",
                "content": "One difficult moment does not define you.",
            }
        ],
    }


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("exception", "expected_status", "expected_error_code"),
    [
        (SafetyException("Safety message", []), "safety_blocked", "SafetyException"),
        (ParseException("Invalid AI response format"), "parse_error", "ParseException"),
        (TimeoutError(), "timeout", "TimeoutError"),
        (RuntimeError("provider unavailable"), "provider_error", "RuntimeError"),
    ],
)
async def test_gemini_analyze_cbt_records_failure_statuses_without_raw_request_payload(
    exception,
    expected_status,
    expected_error_code,
):
    with patch("app.services.gemini_client.get_ai_config") as mock_config, \
         patch("app.services.gemini_client.genai.configure"), \
         patch("app.services.gemini_client.genai.GenerativeModel"), \
         patch("app.services.prompt_manager.get_ai_config") as mock_prompt_config:

        mock_config.return_value.gemini_api_key = "test-key"
        mock_config.return_value.gemini_model = "gemini-1.5-flash"
        mock_prompt_config.return_value.gemini_api_key = "test-key"
        mock_prompt_config.return_value.gemini_model = "gemini-1.5-flash"
        client = GeminiClient()

        with patch.object(client, "_detect_distortions_with_retry") as mock_detect, \
             patch("app.services.gemini_client.ai_audit_service.record_ai_audit_log") as mock_record:

            mock_detect.side_effect = exception
            request = CBTAnalysisRequest(
                situation="My email is jane@example.com",
                automatic_thought="I feel hopeless",
            )

            with pytest.raises(type(exception)):
                await client.analyze_cbt(request)

    audit_in = mock_record.call_args.args[0]
    assert audit_in.status == expected_status
    assert audit_in.error_code == expected_error_code
    assert "jane@example.com" not in str(audit_in.masked_request_payload)
    assert audit_in.masked_request_payload == {
        "automatic_thought_length": 15,
        "situation_length": 28,
    }

from unittest.mock import AsyncMock

import httpx
import pytest

from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_provider import LLMParseError, LLMSafetyBlocked
from app.services.openai_client import OpenAIClient


@pytest.fixture
def cbt_request():
    return CBTAnalysisRequest(
        situation="I got critical feedback",
        automatic_thought="I always fail",
    )


@pytest.mark.anyio
async def test_openai_client_uses_responses_api_with_structured_output(cbt_request):
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.return_value = httpx.Response(
        200,
        json={
            "id": "resp_123",
            "output": [
                {
                    "content": [
                        {
                            "type": "output_text",
                            "text": (
                                '{"suggestions":[{"distortion":"Overgeneralization",'
                                '"reasoning":"Uses always"}],"reframes":[{"perspective":"Balanced",'
                                '"content":"Feedback is specific and actionable."}]}'
                            ),
                        }
                    ]
                }
            ],
        },
        request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
    )
    client = OpenAIClient(
        api_key="secret-key",
        model="gpt-5.5",
        http_client=http_client,
        timeout=9,
    )

    result = await client.analyze_cbt(cbt_request)

    assert result.provider == "openai"
    assert result.model == "gpt-5.5"
    assert result.parsed_payload["suggestions"][0]["distortion"] == "Overgeneralization"
    http_client.post.assert_awaited_once()
    _, kwargs = http_client.post.await_args
    assert kwargs["json"]["model"] == "gpt-5.5"
    assert kwargs["json"]["text"]["format"]["type"] == "json_schema"
    assert kwargs["headers"]["Authorization"] == "Bearer secret-key"
    assert kwargs["timeout"] == 9


def test_openai_prompt_keeps_crisis_content_on_safety_path(cbt_request):
    client = OpenAIClient(api_key="secret-key", model="gpt-5.5")

    prompt = client._build_prompt(cbt_request)

    assert "crisis or self-harm" in prompt
    assert "safety path" in prompt


def test_openai_prompt_masks_direct_identifiers_before_provider_call():
    client = OpenAIClient(api_key="secret-key", model="gpt-5.5")

    prompt = client._build_prompt(
        CBTAnalysisRequest(
            situation="My email is jane@example.com and my phone is 415-555-0100",
            automatic_thought="Everyone will contact jane@example.com about this.",
        )
    )

    assert "jane@example.com" not in prompt
    assert "415-555-0100" not in prompt
    assert "[EMAIL]" in prompt
    assert "[PHONE]" in prompt


@pytest.mark.anyio
async def test_openai_client_blocks_crisis_input_before_model_call():
    http_client = AsyncMock(spec=httpx.AsyncClient)
    client = OpenAIClient(
        api_key="secret-key",
        model="gpt-5.5",
        http_client=http_client,
    )

    with pytest.raises(LLMSafetyBlocked) as exc_info:
        await client.analyze_cbt(
            CBTAnalysisRequest(
                situation="I am alone tonight",
                automatic_thought="I want to kill myself",
            )
        )

    assert exc_info.value.crisis_resources
    http_client.post.assert_not_awaited()


@pytest.mark.anyio
async def test_openai_client_parse_failure_raises_typed_error(cbt_request):
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.return_value = httpx.Response(
        200,
        json={"output": [{"content": [{"type": "output_text", "text": "not-json"}]}]},
        request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
    )
    client = OpenAIClient(
        api_key="secret-key",
        model="gpt-5.5",
        http_client=http_client,
    )

    with pytest.raises(LLMParseError):
        await client.analyze_cbt(cbt_request)

from unittest.mock import AsyncMock

import httpx
import logging
import pytest

from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_provider import LLMParseError, LLMProviderError, LLMTimeoutError
from app.services.openai_client import OpenAIClient


@pytest.fixture
def cbt_request():
    return CBTAnalysisRequest(
        situation="I got critical feedback from jane@example.com",
        automatic_thought="I always fail and my phone is 555-123-4567",
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
    assert "jane@example.com" not in kwargs["json"]["input"]
    assert "555-123-4567" not in kwargs["json"]["input"]
    assert kwargs["headers"]["Authorization"] == "Bearer secret-key"
    assert kwargs["timeout"] == 9


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


@pytest.mark.anyio
async def test_openai_client_malformed_structured_output_raises_parse_error(cbt_request):
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.return_value = httpx.Response(
        200,
        json={"output": [{"content": [{"type": "output_text"}]}]},
        request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
    )
    client = OpenAIClient(
        api_key="secret-key",
        model="gpt-5.5",
        http_client=http_client,
    )

    with pytest.raises(LLMParseError):
        await client.analyze_cbt(cbt_request)


@pytest.mark.anyio
async def test_openai_client_timeout_raises_typed_error(cbt_request):
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.side_effect = httpx.TimeoutException("slow provider")
    client = OpenAIClient(
        api_key="secret-key",
        model="gpt-5.5",
        http_client=http_client,
    )

    with pytest.raises(LLMTimeoutError):
        await client.analyze_cbt(cbt_request)


@pytest.mark.anyio
async def test_openai_client_connect_error_raises_provider_error(cbt_request):
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.side_effect = httpx.ConnectError("unreachable")
    client = OpenAIClient(
        api_key="secret-key",
        model="gpt-5.5",
        http_client=http_client,
    )

    with pytest.raises(LLMProviderError):
        await client.analyze_cbt(cbt_request)


@pytest.mark.anyio
async def test_openai_client_failure_logs_error_type_without_api_key(cbt_request, caplog):
    secret = "sk-test-secret-that-must-not-appear"
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.side_effect = httpx.ConnectError(f"provider echoed {secret}")
    client = OpenAIClient(
        api_key=secret,
        model="gpt-5.5",
        http_client=http_client,
    )

    with caplog.at_level(logging.ERROR, logger="app.services.openai_client"):
        with pytest.raises(LLMProviderError):
            await client.analyze_cbt(cbt_request)

    records = [
        record for record in caplog.records
        if record.message == "OpenAI provider request failed"
    ]
    assert len(records) == 1
    assert records[0].error_type == "ConnectError"
    assert secret not in caplog.text
    assert secret not in str(records[0].__dict__)

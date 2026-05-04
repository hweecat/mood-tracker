from unittest.mock import AsyncMock

import httpx
import pytest

from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_provider import LLMParseError, LLMSafetyBlocked
from app.services.ollama_client import OllamaClient


@pytest.fixture
def cbt_request():
    return CBTAnalysisRequest(
        situation="My friend did not reply",
        automatic_thought="They hate me",
    )


@pytest.mark.anyio
async def test_ollama_client_posts_to_local_generate_endpoint(cbt_request):
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.return_value = httpx.Response(
        200,
        json={
            "model": "llama3.1",
            "response": (
                '{"suggestions":[{"distortion":"Mind Reading","reasoning":"Assumes feelings"}],'
                '"reframes":[{"perspective":"Evidence-based","content":"There may be many reasons."}]}'
            ),
        },
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )
    client = OllamaClient(
        base_url="http://localhost:11434",
        model="llama3.1",
        http_client=http_client,
        timeout=5,
    )

    result = await client.analyze_cbt(cbt_request)

    assert result.provider == "ollama"
    assert result.model == "llama3.1"
    assert result.parsed_payload["reframes"][0]["perspective"] == "Evidence-based"
    http_client.post.assert_awaited_once()
    args, kwargs = http_client.post.await_args
    assert args[0] == "http://localhost:11434/api/generate"
    assert kwargs["json"]["model"] == "llama3.1"
    assert kwargs["json"]["stream"] is False
    assert kwargs["timeout"] == 5


def test_ollama_prompt_keeps_crisis_content_on_safety_path(cbt_request):
    client = OllamaClient(base_url="http://localhost:11434", model="llama3.1")

    prompt = client._build_prompt(cbt_request)

    assert "crisis or self-harm" in prompt
    assert "safety path" in prompt


@pytest.mark.anyio
async def test_ollama_client_blocks_crisis_input_before_model_call():
    http_client = AsyncMock(spec=httpx.AsyncClient)
    client = OllamaClient(
        base_url="http://localhost:11434",
        model="llama3.1",
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
async def test_ollama_client_parse_failure_raises_typed_error(cbt_request):
    http_client = AsyncMock(spec=httpx.AsyncClient)
    http_client.post.return_value = httpx.Response(
        200,
        json={"response": "not-json"},
        request=httpx.Request("POST", "http://localhost:11434/api/generate"),
    )
    client = OllamaClient(
        base_url="http://localhost:11434",
        model="llama3.1",
        http_client=http_client,
    )

    with pytest.raises(LLMParseError):
        await client.analyze_cbt(cbt_request)

from unittest.mock import AsyncMock

import httpx
import pytest

from app.schemas.cbt import CBTAnalysisRequest
from app.services.llm_provider import LLMParseError
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

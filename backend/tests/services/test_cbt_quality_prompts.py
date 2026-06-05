import pytest

import app.services.prompt_manager as prompt_manager
from app.services.prompt_manager import PromptManager


def test_prompt_manager_default_prompts_do_not_read_provider_credentials(monkeypatch):
    """Default prompt access should not depend on Gemini provider configuration."""
    monkeypatch.setattr(
        prompt_manager,
        "get_ai_config",
        lambda: pytest.fail("PromptManager should not read provider credentials"),
        raising=False,
    )

    manager = PromptManager()

    assert "Situation: {situation}" in manager._format_distortion_prompt()
    assert "Automatic Thought: {automatic_thought}" in manager._format_reframing_prompt()


@pytest.mark.anyio
async def test_reframing_prompt_requires_empathy_agency_and_optional_action_plans():
    prompt, version = await PromptManager().get_reframing_prompt()

    assert version == "default"
    assert "validate the user's feeling" in prompt
    assert "avoid diagnosis" in prompt
    assert "do not minimize" in prompt
    assert "optional" in prompt
    assert "one small next step" in prompt
    assert "crisis or self-harm" in prompt
    assert "safety path" in prompt

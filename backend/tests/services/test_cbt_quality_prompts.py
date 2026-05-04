import pytest

from app.services.prompt_manager import PromptManager


@pytest.mark.anyio
async def test_reframing_prompt_requires_empathy_agency_and_optional_action_plans():
    prompt, version = await PromptManager().get_reframing_prompt()

    assert version == "default"
    assert "validate the user's feeling" in prompt
    assert "avoid diagnosis" in prompt
    assert "do not minimize" in prompt
    assert "optional" in prompt
    assert "one small next step" in prompt

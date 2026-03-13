# backend/tests/services/test_prompt_manager.py

import pytest
from unittest.mock import patch, MagicMock
from app.services.prompt_manager import PromptManager


class TestPromptManager:
    """Tests for PromptManager prompt template loading."""

    def test_init_creates_config(self):
        """Test PromptManager initializes with config."""
        with patch('app.services.prompt_manager.get_ai_config') as mock_config:
            PromptManager()
            mock_config.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_distortion_prompt_default(self):
        """Test default distortion prompt is returned when version not specified."""
        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()
            prompt, version = await manager.get_distortion_prompt()

            assert version == "default"
            assert "cognitive behavioral therapy" in prompt.lower()
            assert "distortions" in prompt.lower()
            assert "{situation}" in prompt
            assert "{automatic_thought}" in prompt

    @pytest.mark.asyncio
    async def test_get_distortion_prompt_with_version_not_found(self):
        """Test default prompt returned when specific version not found in DB."""
        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()

            # Mock DB to return no rows
            mock_db = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = None
            mock_db.cursor.return_value = mock_cursor

            with patch('app.services.prompt_manager.get_db', return_value=iter([mock_db])):
                prompt, version = await manager.get_distortion_prompt(version="1.0.0")

                assert version == "default"
                mock_cursor.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_distortion_prompt_from_db(self):
        """Test prompt loaded from DB when version exists."""
        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()

            # Mock DB to return a row
            test_template = "Test template {situation} {automatic_thought}"
            mock_db = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {"template": test_template, "id": "test-id"}
            mock_db.cursor.return_value = mock_cursor

            with patch('app.services.prompt_manager.get_db', return_value=iter([mock_db])):
                prompt, version = await manager.get_distortion_prompt(version="1.0.0")

                assert prompt == test_template
                assert version == "test-id"

    @pytest.mark.asyncio
    async def test_get_distortion_prompt_malformed_template_fallback(self):
        """Test that malformed DB templates (missing placeholders) fallback to default."""
        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()

            # Mock DB to return a row with MISSING {situation}
            malformed_template = "Missing situation placeholder {automatic_thought}"
            mock_db = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {"template": malformed_template, "id": "bad-id"}
            mock_db.cursor.return_value = mock_cursor

            with patch('app.services.prompt_manager.get_db', return_value=iter([mock_db])):
                prompt, version = await manager.get_distortion_prompt(version="1.0.0")

                assert version == "default"
                assert "{situation}" in prompt

    @pytest.mark.asyncio
    async def test_get_reframing_prompt_default(self):
        """Test default reframing prompt is returned when version not specified."""
        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()
            prompt, version = await manager.get_reframing_prompt()

            assert version == "default"
            assert "rational reframes" in prompt.lower()
            assert "{situation}" in prompt
            assert "{automatic_thought}" in prompt
            assert "{distortions}" in prompt

    @pytest.mark.asyncio
    async def test_get_reframing_prompt_from_db(self):
        """Test reframing prompt loaded from DB when version exists."""
        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()

            # Mock DB to return a row
            test_template = "Test reframing template {situation} {automatic_thought} {distortions}"
            mock_db = MagicMock()
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {"template": test_template, "id": "reframe-id"}
            mock_db.cursor.return_value = mock_cursor

            with patch('app.services.prompt_manager.get_db', return_value=iter([mock_db])):
                prompt, version = await manager.get_reframing_prompt(version="1.0.0")

                assert prompt == test_template
                assert version == "reframe-id"

    @pytest.mark.asyncio
    async def test_db_error_falls_back_to_default(self):
        """Test DB error falls back to default template."""
        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()

            # Mock DB to raise error
            mock_db = MagicMock()
            mock_db.cursor.side_effect = Exception("DB error")

            with patch('app.services.prompt_manager.get_db', return_value=iter([mock_db])):
                prompt, version = await manager.get_distortion_prompt(version="1.0.0")

                # Should fall back to default
                assert version == "default"

    def test_format_distortion_prompt_includes_all_distortions(self):
        """Test default distortion prompt includes all 13 cognitive distortions."""
        from app.core.constants import COGNITIVE_DISTORTIONS

        with patch('app.services.prompt_manager.get_ai_config'):
            manager = PromptManager()
            prompt = manager._format_distortion_prompt()

            for distortion in COGNITIVE_DISTORTIONS:
                assert distortion in prompt

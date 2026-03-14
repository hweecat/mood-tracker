# backend/app/services/prompt_manager.py

from typing import Optional, Tuple
from app.core.ai_config import get_ai_config
from app.core.constants import COGNITIVE_DISTORTIONS
from app.core.logging import get_logger
from app.db.session import get_db

logger = get_logger(__name__)

class PromptManager:
    """Manages prompt templates with versioning support."""

    # Default prompt templates (fallback when DB is unavailable or version not found)
    DEFAULT_DISTORTION_PROMPT = """
You are a cognitive behavioral therapy assistant. Analyze the following automatic thought for cognitive distortions.

Situation: {situation}
Automatic Thought: {automatic_thought}

Identify which cognitive distortions (from the predefined list) are present in this thought.
For each distortion detected, provide:
1. The distortion name (must be exactly one of: {distortions})
2. A brief reasoning explaining why this distortion applies

Return ONLY a valid JSON object with this structure:
{{
  "distortions": [
    {{
      "distortion": "exact distortion name",
      "reasoning": "brief explanation"
    }}
  ]
}}
"""

    DEFAULT_REFRAMING_PROMPT = """
You are a cognitive behavioral therapy assistant. Generate 3 distinct rational reframes for the following automatic thought.

Situation: {situation}
Automatic Thought: {automatic_thought}
Detected Distortions: {distortions}

Generate exactly 3 rational reframes, each from a different perspective:
1. Compassionate - A kind, understanding perspective
2. Logical - A fact-based, analytical perspective
3. Evidence-based - A perspective based on available evidence

Return ONLY a valid JSON object with this structure:
{{
  "reframes": [
    {{
      "perspective": "Compassionate",
      "content": "reframe content"
    }},
    {{
      "perspective": "Logical",
      "content": "reframe content"
    }},
    {{
      "perspective": "Evidence-based",
      "content": "reframe content"
    }}
  ]
}}
"""

    def __init__(self):
        self.config = get_ai_config()

    async def get_distortion_prompt(self, version: Optional[str] = None) -> Tuple[str, str]:
        """
        Get the distortion detection prompt template.

        Returns:
            Tuple of (prompt_template, version_id)
        """
        if version:
            db_gen = get_db()
            try:
                db = next(db_gen)
                cursor = db.cursor()
                cursor.execute(
                    "SELECT id, template FROM prompt_versions WHERE version = ? AND prompt_type = ? AND is_active = 1",
                    (version, "distortion_detection")
                )
                row = cursor.fetchone()
                if row:
                    template = row["template"]
                    # Validate template has required placeholders
                    if "{situation}" in template and "{automatic_thought}" in template:
                        logger.info("Loaded distortion prompt from DB", extra={"version": version})
                        return template, row["id"]
                    else:
                        logger.error("DB distortion prompt missing placeholders", extra={"version": version})
            except Exception as e:
                logger.error("Failed to load distortion prompt from DB", extra={"error": str(e)})
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass

        # Use default template
        logger.info("Using default distortion prompt template")
        return self._format_distortion_prompt(), "default"

    async def get_reframing_prompt(self, version: Optional[str] = None) -> Tuple[str, str]:
        """
        Get the reframing prompt template.

        Returns:
            Tuple of (prompt_template, version_id)
        """
        if version:
            db_gen = get_db()
            try:
                db = next(db_gen)
                cursor = db.cursor()
                cursor.execute(
                    "SELECT id, template FROM prompt_versions WHERE version = ? AND prompt_type = ? AND is_active = 1",
                    (version, "reframing")
                )
                row = cursor.fetchone()
                if row:
                    template = row["template"]
                    # Validate template has required placeholders
                    if "{situation}" in template and "{automatic_thought}" in template and "{distortions}" in template:
                        logger.info("Loaded reframing prompt from DB", extra={"version": version})
                        return template, row["id"]
                    else:
                        logger.error("DB reframing prompt missing placeholders", extra={"version": version})
            except Exception as e:
                logger.error("Failed to load reframing prompt from DB", extra={"error": str(e)})
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass

        # Use default template
        logger.info("Using default reframing prompt template")
        return self._format_reframing_prompt(), "default"

    def _format_distortion_prompt(self) -> str:
        """Format the default distortion prompt with distortions list."""
        distortions_str = '", "'.join(COGNITIVE_DISTORTIONS)
        # Use replace for the distortions list to avoid double-formatting issues with JSON braces
        return self.DEFAULT_DISTORTION_PROMPT.replace("{distortions}", f'"{distortions_str}"')

    def _format_reframing_prompt(self) -> str:
        """Format the default reframing prompt."""
        # No placeholders to pre-format here, but returning for consistency
        return self.DEFAULT_REFRAMING_PROMPT

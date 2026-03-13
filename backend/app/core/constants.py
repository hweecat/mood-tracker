# backend/app/core/constants.py
"""
Constants for the MindfulTrack AI integration.

This module defines the cognitive distortions list, safety fallback messages,
and crisis resources used throughout the AI services.
"""

# The 13 cognitive distortions from Cognitive Behavioral Therapy
# Reference: Burns, David D. (1980). Feeling Good: The New Mood Therapy.
COGNITIVE_DISTORTIONS = [
    "all-or-nothing thinking",
    "overgeneralization",
    "mental filter",
    "disqualifying the positive",
    "jumping to conclusions",
    "magnification",
    "emotional reasoning",
    "should statements",
    "labeling",
    "personalization",
    "control fallacies",
    "fallacy of fairness",
    "always being right"
]

# Safety fallback messages for different content categories
# These are shown when AI detects potentially harmful content
SAFETY_FALLBACK_MESSAGES = {
    "sexual": "I notice this topic may be sensitive. For support, please reach out to professional resources.",
    "hate_speech": "I'm unable to process this content. For support, please reach out to professional resources.",
    "harassment": "I notice you may be experiencing distress. Crisis resources are available below.",
    "dangerous_content": "If you're in immediate danger, please call emergency services or a crisis line."
}

# Crisis resources for high-harm probability content
# These are displayed when safety ratings indicate potential crisis
CRISIS_RESOURCES = [
    {"name": "National Suicide Prevention Lifeline", "phone": "988"},
    {"name": "Crisis Text Line", "text": "HOME to 741741"},
    {"name": "International Association for Suicide Prevention", "url": "https://www.iasp.info/resources/Crisis_Centres/"}
]
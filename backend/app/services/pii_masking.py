import re


EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)")


def mask_provider_text(text: str) -> str:
    masked = EMAIL_RE.sub("[EMAIL]", text)
    return PHONE_RE.sub("[PHONE]", masked)

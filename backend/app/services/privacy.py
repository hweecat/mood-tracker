import re
import uuid
from typing import Dict, List, Tuple, Set
from pydantic import BaseModel

class MaskingResult(BaseModel):
    masked_text: str
    mapping: Dict[str, str]

class PrivacyService:
    # Basic Regex Patterns
    EMAIL_PATTERN = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    # Simplified phone pattern (matches various common formats)
    PHONE_PATTERN = r'(\+\d{1,3}\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}'

    # Common names for dictionary-based masking
    # This is a starting set; in a real app, this would be a larger list or loaded from a file
    COMMON_NAMES: Set[str] = {
        "John", "Jane", "Alice", "Bob", "Charlie", "David", "Eve", "Frank", "Grace", 
        "Henry", "Ivy", "Jack", "Karl", "Liam", "Mary", "Nancy", "Olivia", "Paul", 
        "Quinn", "Rose", "Sam", "Tom", "Ursula", "Victor", "Wendy", "Xavier", "Yara", "Zoe"
    }

    def __init__(self, additional_names: List[str] = None):
        if additional_names:
            self.COMMON_NAMES.update(additional_names)

    def mask(self, text: str) -> MaskingResult:
        if not text:
            return MaskingResult(masked_text="", mapping={})

        mapping: Dict[str, str] = {}
        masked_text = text

        # 1. Mask Emails
        def email_repl(match):
            original = match.group(0)
            token = f"[EMAIL_{len(mapping) + 1}]"
            mapping[token] = original
            return token
        
        masked_text = re.sub(self.EMAIL_PATTERN, email_repl, masked_text)

        # 2. Mask Phone Numbers
        def phone_repl(match):
            original = match.group(0)
            token = f"[PHONE_{len(mapping) + 1}]"
            mapping[token] = original
            return token
        
        masked_text = re.sub(self.PHONE_PATTERN, phone_repl, masked_text)

        # 3. Mask Common Names (Dictionary-based)
        # Sort names by length descending to handle "Sam" before "Samuel" if both were present
        sorted_names = sorted(list(self.COMMON_NAMES), key=len, reverse=True)
        for name in sorted_names:
            # Match whole word only, case insensitive but preserve original for mapping
            name_pattern = rf'\b{re.escape(name)}\b'
            
            def name_repl(match):
                original = match.group(0)
                # Check if we already have a token for this specific occurrence
                # (using a simple dictionary check for the value is fine since it's transient)
                for t, v in mapping.items():
                    if v == original:
                        return t
                
                token = f"[NAME_{len(mapping) + 1}]"
                mapping[token] = original
                return token
            
            masked_text = re.sub(name_pattern, name_repl, masked_text, flags=re.IGNORECASE)

        return MaskingResult(masked_text=masked_text, mapping=mapping)

    def unmask(self, text: str, mapping: Dict[str, str]) -> str:
        if not text or not mapping:
            return text

        unmasked_text = text
        # Replace tokens with original values
        for token, original in mapping.items():
            unmasked_text = unmasked_text.replace(token, original)
        
        return unmasked_text

# backend/app/models/prompt_version.py

import uuid
from sqlmodel import SQLModel, Field, Text
from datetime import datetime
from typing import Optional

class PromptVersion(SQLModel, table=True):
    """
    Data model for AI prompt versioning.
    
    Allows storing and retrieving different versions of prompts used for
    distortion detection and rational reframing.
    """
    __tablename__ = "prompt_versions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    version: str = Field(index=True)
    prompt_type: str = Field(index=True)  # "distortion_detection" or "reframing"
    template: str = Field(sa_type=Text)
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

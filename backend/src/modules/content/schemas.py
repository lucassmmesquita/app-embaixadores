"""
═══════════════════════════════════════════════════════════════
  Content Module — Schemas
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class ContentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    description: str | None = None
    content_type: str = Field(..., description="Type: image, video, document, link")
    file_url: str | None = None
    file_name: str | None = None
    thumbnail_url: str | None = None
    thumbnail_name: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    share_text: str | None = None
    points_per_share: int = 5
    is_featured: bool = False


class ContentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    file_url: str | None = None
    file_name: str | None = None
    thumbnail_url: str | None = None
    thumbnail_name: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    share_text: str | None = None
    points_per_share: int | None = None
    is_featured: bool | None = None
    is_active: bool | None = None


class ContentResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    content_type: str
    file_url: str | None = None
    file_name: str | None = None
    thumbnail_url: str | None = None
    thumbnail_name: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    share_text: str | None = None
    points_per_share: int = 5
    is_featured: bool = False
    total_shares: int = 0
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def resolve_upload_urls(self) -> "ContentResponse":
        """Resolve relative /uploads/ paths to full API URLs."""
        import os
        api_url = os.environ.get("EXPO_PUBLIC_API_URL", "http://localhost:8000").rstrip("/")
        if self.file_url and self.file_url.startswith("/uploads"):
            self.file_url = f"{api_url}{self.file_url}"
        if self.thumbnail_url and self.thumbnail_url.startswith("/uploads"):
            self.thumbnail_url = f"{api_url}{self.thumbnail_url}"
        return self


class ContentShareResponse(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    platform: str | None = None
    shared_at: datetime

    model_config = {"from_attributes": True}

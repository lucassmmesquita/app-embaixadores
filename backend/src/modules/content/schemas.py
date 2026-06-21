"""
═══════════════════════════════════════════════════════════════
  Content Module — Schemas
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ContentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    description: str | None = None
    content_type: str = Field(..., description="Type: image, video, document, link")
    file_url: str | None = None
    thumbnail_url: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    share_text: str | None = None
    points_per_share: int = 5
    is_featured: bool = False


class ContentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    file_url: str | None = None
    thumbnail_url: str | None = None
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
    thumbnail_url: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    share_text: str | None = None
    points_per_share: int = 5
    is_featured: bool = False
    total_shares: int = 0
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentShareResponse(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    platform: str | None = None
    shared_at: datetime

    model_config = {"from_attributes": True}

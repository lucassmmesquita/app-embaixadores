"""
═══════════════════════════════════════════════════════════════
  Missions Module — Schemas
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class MissionCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    icon: str | None = None
    color: str | None = None

    model_config = {"from_attributes": True}


class MissionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    description: str = Field(..., min_length=10)
    category_id: uuid.UUID | None = None
    mission_type: str = "one_time"
    action_type: str
    points_reward: int = Field(..., ge=1)
    xp_reward: int = 0
    required_count: int = 1
    min_level_id: uuid.UUID | None = None
    badge_reward_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_participants: int | None = None
    requires_verification: bool = False
    verification_type: str | None = None
    is_featured: bool = False
    cover_image_url: str | None = None


class MissionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: uuid.UUID | None = None
    points_reward: int | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    cover_image_url: str | None = None


class MissionResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    category: MissionCategoryResponse | None = None
    mission_type: str
    action_type: str
    points_reward: int
    xp_reward: int = 0
    required_count: int = 1
    is_featured: bool = False
    is_active: bool = True
    requires_verification: bool = False
    cover_image_url: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    max_participants: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMissionResponse(BaseModel):
    id: uuid.UUID
    mission: MissionResponse
    progress_count: int = 0
    status: str = "in_progress"
    started_at: datetime
    completed_at: datetime | None = None
    points_awarded: int = 0

    model_config = {"from_attributes": True}


class MissionSubmit(BaseModel):
    evidence_url: str | None = None
    notes: str | None = None

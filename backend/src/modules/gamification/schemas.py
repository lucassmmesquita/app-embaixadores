"""
═══════════════════════════════════════════════════════════════
  Gamification Module — Schemas
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class BadgeResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    icon_url: str | None = None
    category: str = "achievement"
    rarity: str = "common"
    criteria_type: str | None = None
    criteria_value: int | None = None
    is_active: bool = True

    model_config = {"from_attributes": True}


class BadgeCreate(BaseModel):
    name: str
    description: str
    icon_url: str | None = None
    category: str = "achievement"
    rarity: str = "common"
    criteria_type: str | None = None
    criteria_value: int | None = None
    is_active: bool = True


class BadgeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon_url: str | None = None
    category: str | None = None
    rarity: str | None = None
    criteria_type: str | None = None
    criteria_value: int | None = None
    is_active: bool | None = None


class UserBadgeResponse(BaseModel):
    id: uuid.UUID
    badge: BadgeResponse
    awarded_at: datetime
    seen: bool = False

    model_config = {"from_attributes": True}


class ActivityResponse(BaseModel):
    id: uuid.UUID
    action_type: str
    action_description: str | None = None
    points_awarded: int = 0
    reference_type: str | None = None
    reference_id: uuid.UUID | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PointTransactionResponse(BaseModel):
    """Single entry from the immutable point ledger (PRD §5.1)."""
    id: uuid.UUID
    points: int
    transaction_type: str
    source_type: str
    source_id: uuid.UUID | None = None
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: uuid.UUID
    full_name: str
    avatar_url: str | None = None
    total_points: int
    level_name: str | None = None
    level_color: str | None = None
    city: str | None = None

    model_config = {"from_attributes": True}


class UserStats(BaseModel):
    total_points: int = 0
    current_level_name: str | None = None
    current_level_order: int = 0
    next_level_name: str | None = None
    points_to_next_level: int = 0
    progress_percentage: float = 0.0
    total_missions_completed: int = 0
    total_events_attended: int = 0
    total_badges: int = 0
    rank_position: int = 0
    total_referrals: int = 0
    level_pending_approval: bool = False
    recent_activities: list[ActivityResponse] = []
    badges: list[UserBadgeResponse] = []

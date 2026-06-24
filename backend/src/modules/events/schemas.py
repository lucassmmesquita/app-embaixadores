"""
═══════════════════════════════════════════════════════════════
  Events Module — Schemas
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class EventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    description: str | None = None
    event_type: str = "meeting"
    location_name: str | None = None
    address: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    online_url: str | None = None
    start_datetime: datetime
    end_datetime: datetime | None = None
    max_capacity: int | None = None
    min_level_id: uuid.UUID | None = None
    points_reward: int = 0
    cover_image_url: str | None = None
    is_featured: bool = False
    region_id: uuid.UUID | None = None
    checkin_radius_meters: int | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_type: str | None = None
    location_name: str | None = None
    address: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    online_url: str | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    max_capacity: int | None = None
    points_reward: int | None = None
    is_featured: bool | None = None
    is_active: bool | None = None
    cover_image_url: str | None = None
    checkin_radius_meters: int | None = None


class EventResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    event_type: str
    location_name: str | None = None
    address: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    online_url: str | None = None
    start_datetime: datetime
    end_datetime: datetime | None = None
    max_capacity: int | None = None
    points_reward: int = 0
    cover_image_url: str | None = None
    is_featured: bool = False
    is_active: bool = True
    participants_count: int = 0
    checkin_code: str | None = None
    checkin_start: datetime | None = None
    checkin_end: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EventParticipantResponse(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    check_in_at: datetime | None = None
    registered_at: datetime

    model_config = {"from_attributes": True}


class CheckinRequest(BaseModel):
    """Check-in: code OR geo coordinates (or both)."""
    checkin_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None

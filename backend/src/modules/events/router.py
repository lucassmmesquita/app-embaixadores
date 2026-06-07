"""
═══════════════════════════════════════════════════════════════
  Events Module — Router
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.events.schemas import EventResponse
from src.modules.events.service import EventService
from src.modules.users.models import Profile
from src.shared.pagination import PaginationParams

router = APIRouter()


@router.get("", response_model=dict)
async def list_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    event_type: str | None = None,
    region_id: uuid.UUID | None = None,
    upcoming_only: bool = True,
):
    """List events."""
    service = EventService(db)
    params = PaginationParams(page=page, page_size=page_size)
    return await service.list_events(
        params=params, event_type=event_type, region_id=region_id, upcoming_only=upcoming_only
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get event details."""
    service = EventService(db)
    return await service.get_event(event_id)


@router.post("/{event_id}/register")
async def register_for_event(
    event_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register for an event."""
    service = EventService(db)
    participant = await service.register_for_event(current_user.id, event_id)
    return {"message": "Inscrição realizada", "participant_id": str(participant.id)}


@router.post("/{event_id}/checkin")
async def checkin_event(
    event_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Check-in at an event."""
    service = EventService(db)
    return await service.checkin(current_user.id, event_id)

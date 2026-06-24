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
from src.modules.events.schemas import CheckinRequest, EventResponse
from src.modules.events.service import EventService
from src.modules.users.models import Profile
from src.shared.pagination import PaginationParams

router = APIRouter()


@router.get("")
async def list_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Profile, Depends(get_current_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    event_type: str | None = None,
    region_id: uuid.UUID | None = None,
    upcoming_only: bool = True,
    include_inactive: bool = False,
):
    """List events (requires authentication)."""
    service = EventService(db)
    params = PaginationParams(page=page, page_size=page_size)
    result = await service.list_events(
        params=params, event_type=event_type, region_id=region_id,
        upcoming_only=upcoming_only, include_inactive=include_inactive,
        user_id=current_user.id,
    )
    # Serialize ORM items with participants_count
    items = []
    for e in result.items:
        data = EventResponse.model_validate(e)
        data.participants_count = len(e.participants) if e.participants else 0
        items.append(data)

    return {
        "items": items,
        "total": result.total,
        "page": result.page,
        "page_size": result.page_size,
        "total_pages": result.total_pages,
    }


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
    """Register for an event (RSVP)."""
    service = EventService(db)
    participant = await service.register_for_event(current_user.id, event_id)
    return {"message": "Inscrição realizada", "participant_id": str(participant.id)}


@router.post("/{event_id}/checkin")
async def checkin_event(
    event_id: uuid.UUID,
    data: CheckinRequest,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Check-in at an event.
    PRD §4.3: Requires event code + optional geo location.
    """
    service = EventService(db)
    return await service.checkin(current_user.id, event_id, data)


@router.post("/{event_id}/share")
async def share_event(
    event_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    platform: str = Query(default="whatsapp"),
):
    """
    Record an event share and award points.
    Same flow as content sharing (PRD §5).
    """
    service = EventService(db)
    return await service.share_event(current_user.id, event_id, platform)

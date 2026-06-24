"""
═══════════════════════════════════════════════════════════════
  Notifications Module — Router
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.notifications.service import NotificationService
from src.modules.users.models import Profile

router = APIRouter()


@router.get("")
async def get_my_notifications(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, le=100),
):
    """Get the current user's notifications."""
    service = NotificationService(db)
    return await service.get_user_notifications(current_user.id, unread_only=unread_only, limit=limit)


@router.get("/unread-count")
async def get_unread_count(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the count of unread notifications."""
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark a notification as read."""
    service = NotificationService(db)
    await service.mark_as_read(notification_id, current_user.id)
    return {"message": "Notificação marcada como lida"}


@router.patch("/read-all")
async def mark_all_as_read(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark all notifications as read."""
    service = NotificationService(db)
    await service.mark_all_as_read(current_user.id)
    return {"message": "Todas as notificações marcadas como lidas"}


@router.delete("/clear-all")
async def clear_all_notifications(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete all notifications for the current user."""
    service = NotificationService(db)
    count = await service.clear_all(current_user.id)
    return {"message": f"{count} notificação(ões) removida(s)", "deleted_count": count}

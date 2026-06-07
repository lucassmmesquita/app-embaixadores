"""
═══════════════════════════════════════════════════════════════
  Notifications Module — Router
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.notifications.models import Notification
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
    query = select(Notification).where(
        (Notification.user_id == current_user.id) | (Notification.user_id.is_(None))
    )

    if unread_only:
        query = query.where(Notification.is_read.is_(False))

    query = query.order_by(Notification.sent_at.desc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark a notification as read."""
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id)
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    return {"message": "Notificação marcada como lida"}


@router.patch("/read-all")
async def mark_all_as_read(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .where(Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    return {"message": "Todas as notificações marcadas como lidas"}

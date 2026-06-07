"""
═══════════════════════════════════════════════════════════════
  Content Module — Router (simplified for Phase 1)
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.content.models import Content, ContentShare
from src.modules.gamification.engine import GamificationEngine
from src.modules.users.models import Profile
from src.shared.pagination import PaginatedResponse, PaginationParams

router = APIRouter()


@router.get("")
async def list_content(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    content_type: str | None = None,
    category: str | None = None,
):
    """List available content for sharing."""
    query = select(Content).where(Content.is_active.is_(True))
    count_query = select(func.count(Content.id)).where(Content.is_active.is_(True))

    if content_type:
        query = query.where(Content.content_type == content_type)
        count_query = count_query.where(Content.content_type == content_type)
    if category:
        query = query.where(Content.category == category)
        count_query = count_query.where(Content.category == category)

    total = (await db.execute(count_query)).scalar() or 0
    params = PaginationParams(page=page, page_size=page_size)
    query = query.order_by(Content.is_featured.desc(), Content.created_at.desc())
    query = query.offset(params.offset).limit(params.page_size)

    result = await db.execute(query)
    items = list(result.scalars().all())
    return PaginatedResponse.create(items=items, total=total, params=params)


@router.post("/{content_id}/share")
async def share_content(
    content_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    platform: str = Query(default="whatsapp"),
):
    """Record a content share and award points."""
    content_result = await db.execute(select(Content).where(Content.id == content_id))
    content = content_result.scalar_one_or_none()
    if not content:
        from src.shared.exceptions import NotFoundException
        raise NotFoundException("Conteúdo não encontrado")

    # Record share
    share = ContentShare(content_id=content_id, user_id=current_user.id, platform=platform)
    db.add(share)

    # Increment share count
    await db.execute(
        update(Content).where(Content.id == content_id).values(total_shares=Content.total_shares + 1)
    )

    # Award points
    engine = GamificationEngine(db)
    result = await engine.award_points(
        user_id=current_user.id,
        points=content.points_per_share,
        action_type="content_share",
        description=f"Compartilhou: {content.title}",
        reference_type="content",
        reference_id=content_id,
    )

    return {"message": "Compartilhamento registrado", "gamification": result}

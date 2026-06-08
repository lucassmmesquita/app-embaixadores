"""
═══════════════════════════════════════════════════════════════
  Content Module — Router
  PRD §6.1.7: Biblioteca de materiais oficiais
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.content.schemas import ContentResponse
from src.modules.content.service import ContentService
from src.modules.users.models import Profile
from src.shared.pagination import PaginationParams

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
    service = ContentService(db)
    params = PaginationParams(page=page, page_size=page_size)
    result = await service.list_content(params=params, content_type=content_type, category=category)
    return {
        "items": [ContentResponse.model_validate(c) for c in result.items],
        "total": result.total,
        "page": result.page,
        "page_size": result.page_size,
        "total_pages": result.total_pages,
    }


@router.get("/{content_id}", response_model=ContentResponse)
async def get_content(
    content_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get content details."""
    service = ContentService(db)
    return await service.get_content(content_id)


@router.post("/{content_id}/share")
async def share_content(
    content_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    platform: str = Query(default="whatsapp"),
):
    """
    Record a content share and award points.
    Rate limited to 10 shares/day (PRD §4.3).
    """
    service = ContentService(db)
    return await service.share_content(current_user.id, content_id, platform)

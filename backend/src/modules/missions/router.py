"""
═══════════════════════════════════════════════════════════════
  Missions Module — Router
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.missions.schemas import (
    MissionCategoryResponse,
    MissionResponse,
    MissionSubmit,
    UserMissionResponse,
)
from src.modules.missions.service import MissionService
from src.modules.users.models import Profile
from src.shared.pagination import PaginationParams

router = APIRouter()


@router.get("", response_model=dict)
async def list_missions(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category_id: uuid.UUID | None = None,
    mission_type: str | None = None,
    is_featured: bool | None = None,
):
    """List available missions."""
    service = MissionService(db)
    params = PaginationParams(page=page, page_size=page_size)
    return await service.list_missions(
        params=params, category_id=category_id, mission_type=mission_type, is_featured=is_featured
    )


@router.get("/categories", response_model=list[MissionCategoryResponse])
async def get_categories(db: Annotated[AsyncSession, Depends(get_db)]):
    """Get all mission categories."""
    service = MissionService(db)
    return await service.get_categories()


@router.get("/my-missions", response_model=list[UserMissionResponse])
async def get_my_missions(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the current user's missions."""
    service = MissionService(db)
    return await service.get_user_missions(current_user.id)


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(
    mission_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get mission details."""
    service = MissionService(db)
    return await service.get_mission(mission_id)


@router.post("/{mission_id}/start")
async def start_mission(
    mission_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Start a mission."""
    service = MissionService(db)
    user_mission = await service.start_mission(current_user.id, mission_id)
    return {"message": "Missão iniciada", "user_mission_id": str(user_mission.id)}


@router.post("/{mission_id}/submit")
async def submit_mission(
    mission_id: uuid.UUID,
    data: MissionSubmit,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Submit mission completion."""
    service = MissionService(db)
    return await service.submit_mission(current_user.id, mission_id, data.evidence_url)

"""
═══════════════════════════════════════════════════════════════
  Gamification Module — Router
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.gamification.engine import GamificationEngine
from src.modules.gamification.schemas import LeaderboardEntry, UserStats
from src.modules.users.models import Profile

router = APIRouter()


@router.get("/my-stats", response_model=UserStats)
async def get_my_stats(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the current user's gamification stats."""
    engine = GamificationEngine(db)
    return await engine.get_user_stats(current_user.id)


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, le=100),
    region_id: uuid.UUID | None = Query(default=None),
):
    """Get the points leaderboard."""
    engine = GamificationEngine(db)
    return await engine.get_leaderboard(limit=limit, region_id=region_id)


@router.get("/stats/{user_id}", response_model=UserStats)
async def get_user_stats(
    user_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific user's gamification stats."""
    engine = GamificationEngine(db)
    return await engine.get_user_stats(user_id)

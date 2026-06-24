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
from src.modules.gamification.schemas import LeaderboardEntry, PointTransactionResponse, UserStats
from src.modules.users.models import Profile, Level
from src.modules.users.schemas import LevelResponse

from sqlalchemy import select
from src.modules.gamification.models import Badge
from src.modules.gamification.schemas import BadgeResponse

router = APIRouter()


@router.get("/levels", response_model=list[LevelResponse])
async def get_all_levels(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all levels ordered by progression (public, no auth required)."""
    result = await db.execute(
        select(Level).order_by(Level.order_index.asc())
    )
    return list(result.scalars().all())

@router.get("/badges", response_model=list[BadgeResponse])
async def get_all_active_badges(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all active badges (for the catalog view)."""
    result = await db.execute(
        select(Badge)
        .where(Badge.is_active.is_(True))
        .order_by(Badge.created_at.asc())
    )
    return list(result.scalars().all())


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


@router.get("/my-rank")
async def get_my_rank(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get current user's rank position (PRD §5.2: show rank even outside top-N)."""
    engine = GamificationEngine(db)
    return await engine.get_user_rank(current_user.id)


@router.get("/points-history", response_model=list[PointTransactionResponse])
async def get_points_history(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    Get the current user's point transaction history.
    PRD §6.1.4: Timeline de missões e pontos (transparência do ledger).
    """
    engine = GamificationEngine(db)
    return await engine.get_points_history(current_user.id, limit=limit, offset=offset)


@router.get("/stats/{user_id}", response_model=UserStats)
async def get_user_stats(
    user_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific user's gamification stats."""
    engine = GamificationEngine(db)
    return await engine.get_user_stats(user_id)

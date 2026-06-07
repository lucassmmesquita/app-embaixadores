"""
═══════════════════════════════════════════════════════════════
  Users Module — Router (API Endpoints)
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.users.models import Profile
from src.modules.users.schemas import (
    LevelResponse,
    ProfileResponse,
    ProfileUpdate,
    RegionResponse,
)
from src.modules.users.service import UserService

router = APIRouter()


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get the current user's profile."""
    service = UserService(db)
    return await service.get_profile(current_user.id)


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update the current user's profile."""
    service = UserService(db)
    return await service.update_profile(current_user.id, data)


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(
    user_id: uuid.UUID,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific user's profile."""
    service = UserService(db)
    return await service.get_profile(user_id)


@router.get("/levels/all", response_model=list[LevelResponse])
async def get_levels(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all gamification levels."""
    service = UserService(db)
    return await service.get_levels()


@router.get("/regions/all", response_model=list[RegionResponse])
async def get_regions(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all regions."""
    service = UserService(db)
    return await service.get_regions()


@router.post("/me/referral-code")
async def generate_referral(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate a referral code for the current user."""
    service = UserService(db)
    code = await service.generate_referral_code(current_user.id)
    return {"referral_code": code}

"""
═══════════════════════════════════════════════════════════════
  Auth Module — Router
═══════════════════════════════════════════════════════════════
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.schemas import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
)
from src.modules.auth.service import AuthService

router = APIRouter()


@router.post("/register", response_model=AuthResponse)
async def register(
    data: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new user account."""
    service = AuthService(db)
    return await service.register(data)


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate and get access tokens."""
    service = AuthService(db)
    return await service.login(data)


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    data: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Refresh an expired access token."""
    service = AuthService(db)
    return await service.refresh_token(data.refresh_token)


@router.post("/logout")
async def logout(
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Sign out the current user."""
    service = AuthService(db)
    return await service.logout("")

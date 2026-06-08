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
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SocialLoginRequest,
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


@router.post("/social", response_model=AuthResponse)
async def social_login(
    data: SocialLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate via Google or Apple social login using an ID token."""
    service = AuthService(db)
    return await service.social_login(data.provider, data.id_token)


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


@router.post("/password/forgot")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Request a password reset email. Always returns success (no email enumeration)."""
    service = AuthService(db)
    return await service.forgot_password(data.email)


@router.post("/password/reset")
async def reset_password(
    data: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Reset password using the token from the email link."""
    service = AuthService(db)
    return await service.reset_password(data.access_token, data.new_password)

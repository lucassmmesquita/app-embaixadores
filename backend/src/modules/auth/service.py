"""
═══════════════════════════════════════════════════════════════
  Auth Module — Service
  Handles registration, login, and token management
  via Supabase Auth + local profile creation.
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.supabase import get_supabase_admin
from src.modules.auth.schemas import LoginRequest, RegisterRequest
from src.modules.users.models import Level, Profile
from src.shared.exceptions import BadRequestException, ConflictException, UnauthorizedException


class AuthService:
    """Authentication business logic using Supabase Auth."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.supabase = get_supabase_admin()

    async def register(self, data: RegisterRequest) -> dict:
        """Register a new user via Supabase Auth and create a local profile."""

        # Check if email already exists locally
        result = await self.db.execute(select(Profile).where(Profile.email == data.email))
        if result.scalar_one_or_none():
            raise ConflictException("E-mail já cadastrado")

        # Create user in Supabase Auth
        try:
            auth_response = self.supabase.auth.sign_up({
                "email": data.email,
                "password": data.password,
                "options": {
                    "data": {
                        "full_name": data.full_name,
                    }
                }
            })
        except Exception as e:
            raise BadRequestException(f"Erro ao criar conta: {e!s}") from e

        if not auth_response.user:
            raise BadRequestException("Erro ao criar conta no sistema de autenticação")

        # Get the initial level (Apoiador)
        level_result = await self.db.execute(
            select(Level).where(Level.order_index == 1)
        )
        initial_level = level_result.scalar_one_or_none()

        # Handle referral
        referred_by_id = None
        if data.referral_code:
            referrer_result = await self.db.execute(
                select(Profile).where(Profile.referral_code == data.referral_code)
            )
            referrer = referrer_result.scalar_one_or_none()
            if referrer:
                referred_by_id = referrer.id

        # Create local profile
        profile = Profile(
            id=uuid.UUID(auth_response.user.id),
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            city=data.city,
            state=data.state,
            current_level_id=initial_level.id if initial_level else None,
            referred_by=referred_by_id,
            referral_code=str(uuid.uuid4())[:8].upper(),
            terms_accepted_at=datetime.now(timezone.utc),
        )
        self.db.add(profile)
        await self.db.flush()

        return {
            "access_token": auth_response.session.access_token if auth_response.session else "",
            "refresh_token": auth_response.session.refresh_token if auth_response.session else "",
            "token_type": "bearer",
            "user_id": str(profile.id),
        }

    async def login(self, data: LoginRequest) -> dict:
        """Authenticate user via Supabase Auth."""
        try:
            auth_response = self.supabase.auth.sign_in_with_password({
                "email": data.email,
                "password": data.password,
            })
        except Exception as e:
            raise UnauthorizedException(f"Credenciais inválidas: {e!s}") from e

        if not auth_response.session:
            raise UnauthorizedException("Falha na autenticação")

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer",
            "user_id": auth_response.user.id if auth_response.user else "",
        }

    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh an access token."""
        try:
            auth_response = self.supabase.auth.refresh_session(refresh_token)
        except Exception as e:
            raise UnauthorizedException(f"Token de atualização inválido: {e!s}") from e

        if not auth_response.session:
            raise UnauthorizedException("Falha ao renovar sessão")

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer",
            "user_id": auth_response.user.id if auth_response.user else "",
        }

    async def logout(self, access_token: str) -> dict:
        """Sign out the user."""
        try:
            self.supabase.auth.sign_out(access_token)
        except Exception:
            pass  # Best-effort logout
        return {"message": "Logout realizado com sucesso"}

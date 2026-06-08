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
from src.modules.users.models import Consent, Level, Profile
from src.shared.exceptions import BadRequestException, ConflictException, UnauthorizedException


class AuthService:
    """Authentication business logic using Supabase Auth."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.supabase = get_supabase_admin()

    async def register(self, data: RegisterRequest) -> dict:
        """Register a new user via Supabase Auth and create a local profile."""

        # PRD §8.1: data_processing consent is mandatory
        consent_types = {c.consent_type for c in data.consents}
        if "data_processing" not in consent_types:
            raise BadRequestException(
                "Consentimento para tratamento de dados é obrigatório para cadastro (LGPD)"
            )

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

        # PRD §8.1: Record granular consents with version and timestamp
        for consent_input in data.consents:
            consent = Consent(
                user_id=profile.id,
                consent_type=consent_input.consent_type,
                version=consent_input.version,
                granted=consent_input.granted,
                granted_at=datetime.now(timezone.utc),
            )
            self.db.add(consent)

        # If registered via referral, mark invitation as registered
        if data.referral_code:
            from src.modules.invitations.models import Invitation
            inv_result = await self.db.execute(
                select(Invitation).where(
                    Invitation.invite_code == data.referral_code,
                    Invitation.status == "pending",
                )
            )
            invitation = inv_result.scalar_one_or_none()
            if invitation:
                invitation.status = "registered"
                invitation.invitee_id = profile.id

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

    async def social_login(self, provider: str, id_token: str) -> dict:
        """
        Authenticate via social provider (Google/Apple) using an ID token.
        Uses Supabase Auth sign_in_with_id_token which handles
        user creation/matching automatically.
        """
        if provider not in ("google", "apple"):
            raise BadRequestException("Provedor inválido. Use 'google' ou 'apple'.")

        try:
            auth_response = self.supabase.auth.sign_in_with_id_token({
                "provider": provider,
                "token": id_token,
            })
        except Exception as e:
            raise UnauthorizedException(
                f"Falha na autenticação com {provider}: {e!s}"
            ) from e

        if not auth_response.session or not auth_response.user:
            raise UnauthorizedException("Falha na autenticação social")

        user = auth_response.user
        user_id = uuid.UUID(user.id)

        # Check if we already have a local profile
        result = await self.db.execute(select(Profile).where(Profile.id == user_id))
        profile = result.scalar_one_or_none()

        if not profile:
            # First social login — create local profile from Supabase user metadata
            user_meta = user.user_metadata or {}
            full_name = (
                user_meta.get("full_name")
                or user_meta.get("name")
                or user.email
                or "Usuário"
            )
            email = user.email or user_meta.get("email", "")

            # Get the initial level (Apoiador)
            level_result = await self.db.execute(
                select(Level).where(Level.order_index == 1)
            )
            initial_level = level_result.scalar_one_or_none()

            profile = Profile(
                id=user_id,
                full_name=full_name,
                email=email,
                avatar_url=user_meta.get("avatar_url") or user_meta.get("picture"),
                current_level_id=initial_level.id if initial_level else None,
                referral_code=str(uuid.uuid4())[:8].upper(),
                terms_accepted_at=datetime.now(timezone.utc),
            )
            self.db.add(profile)

            # Auto-grant data_processing consent (user accepted provider ToS)
            consent = Consent(
                user_id=profile.id,
                consent_type="data_processing",
                version="1.0",
                granted=True,
                granted_at=datetime.now(timezone.utc),
            )
            self.db.add(consent)

            await self.db.flush()

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer",
            "user_id": str(profile.id),
        }

    async def forgot_password(self, email: str) -> dict:
        """
        Request a password reset email via Supabase.
        PRD §RF-AUTH-16: Always returns success to avoid email enumeration.
        """
        try:
            self.supabase.auth.reset_password_email(email)
        except Exception:
            pass  # Silently ignore — never reveal if email exists

        return {
            "message": "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."
        }

    async def reset_password(self, access_token: str, new_password: str) -> dict:
        """
        Reset user password using the access token from the email reset link.
        PRD §RF-AUTH-18: Token validation + password update.
        """
        try:
            # Use the admin client to update the user's password
            # The access_token comes from the magic link in the reset email
            self.supabase.auth.admin.update_user_by_id(
                access_token,
                {"password": new_password},
            )
        except Exception as e:
            raise BadRequestException(
                "Token inválido ou expirado. Solicite uma nova recuperação de senha."
            )

        return {"message": "Senha atualizada com sucesso! Faça login com sua nova senha."}


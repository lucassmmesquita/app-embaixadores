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
from src.modules.gamification.engine import GamificationEngine
from src.modules.users.models import Consent, Level, Profile
from src.shared.exceptions import BadRequestException, ConflictException, UnauthorizedException

# ═══ Configurable point values (future: admin panel / DB config) ═══
POINTS_REGISTRATION = 5       # Points awarded to new user on signup
POINTS_REFERRAL_BONUS = 10    # Points awarded to referrer when someone uses their code


class AuthService:
    """Authentication business logic using Supabase Auth."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.supabase = get_supabase_admin()

    async def _process_referral(
        self, referral_code: str | None, new_user_id: uuid.UUID, new_user_email: str | None = None
    ) -> uuid.UUID | None:
        """
        Process a referral code during registration.
        1. Find the Profile that owns the referral_code
        2. Look for an existing pending Invitation from that inviter
        3. If found, update it to 'registered'; if not, create a new one
        4. Return referred_by_id
        """
        if not referral_code:
            return None, None

        from src.modules.invitations.models import Invitation

        # Find the inviter by referral_code
        referrer_result = await self.db.execute(
            select(Profile).where(Profile.referral_code == referral_code)
        )
        referrer = referrer_result.scalar_one_or_none()
        if not referrer:
            return None, None  # Invalid code — silently ignore

        # Anti self-invite
        if referrer.id == new_user_id:
            return None, None

        # Check for existing pending invitation from this inviter
        # Match by inviter's referral_code as invite_code, or by oldest pending
        inv_result = await self.db.execute(
            select(Invitation).where(
                Invitation.inviter_id == referrer.id,
                Invitation.status == "pending",
                Invitation.invitee_id.is_(None),
            ).order_by(Invitation.created_at.asc())
        )
        invitation = inv_result.scalars().first()

        now = datetime.now(timezone.utc)

        if invitation:
            # Update existing pending invitation
            invitation.status = "registered"
            invitation.invitee_id = new_user_id
            invitation.registered_at = now
            if new_user_email:
                invitation.invitee_email = new_user_email
        else:
            # Create a new invitation record automatically
            invitation = Invitation(
                inviter_id=referrer.id,
                invitee_id=new_user_id,
                invitee_email=new_user_email,
                invite_code=referral_code,  # Use the referral_code as invite_code
                status="registered",
                registered_at=now,
            )
            self.db.add(invitation)

        await self.db.flush()
        return referrer.id, invitation

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

        # Create local profile
        profile = Profile(
            id=uuid.UUID(auth_response.user.id),
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            city=data.city,
            state=data.state,
            current_level_id=initial_level.id if initial_level else None,
            referral_code=str(uuid.uuid4())[:8].upper(),
            terms_accepted_at=datetime.now(timezone.utc),
        )
        self.db.add(profile)
        await self.db.flush()

        # Handle referral (unified method)
        referred_by_id, invitation = await self._process_referral(
            data.referral_code, profile.id, data.email
        )
        if referred_by_id:
            profile.referred_by = referred_by_id

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

        await self.db.flush()

        # Award registration points
        await self._award_registration_points(
            profile.id, referred_by_id, invitation
        )

        # If Supabase email-confirmation is enabled, session may be None.
        # Auto-login to get a real session with tokens.
        session = auth_response.session
        if not session or not session.access_token:
            try:
                login_response = self.supabase.auth.sign_in_with_password({
                    "email": data.email,
                    "password": data.password,
                })
                session = login_response.session
            except Exception:
                pass  # If auto-login fails, we still created the account

        return {
            "access_token": session.access_token if session else "",
            "refresh_token": session.refresh_token if session else "",
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

    async def social_login(self, provider: str, id_token: str, referral_code: str | None = None) -> dict:
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
        is_new_user = profile is None

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

        # Handle referral (only for new users)
        referred_by_id = None
        invitation = None
        if is_new_user and referral_code:
            referred_by_id, invitation = await self._process_referral(
                referral_code, profile.id, profile.email
            )
            if referred_by_id:
                profile.referred_by = referred_by_id
                await self.db.flush()

        # Award registration points (only for new users)
        if is_new_user:
            await self._award_registration_points(
                profile.id, referred_by_id, invitation
            )

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer",
            "user_id": str(profile.id),
        }

    async def social_session(self, access_token: str, refresh_token: str, referral_code: str | None = None) -> dict:
        """
        Handle social login when Supabase already completed the OAuth flow.
        Used by the Expo Go WebBrowser approach where Supabase handles Google/Apple
        OAuth and returns tokens directly. This method ensures a local Profile exists.
        """
        try:
            user_response = self.supabase.auth.get_user(access_token)
        except Exception as e:
            raise UnauthorizedException(
                f"Token de sessão inválido: {e!s}"
            ) from e

        user = user_response.user
        if not user:
            raise UnauthorizedException("Usuário não encontrado na sessão")

        user_id = uuid.UUID(user.id)

        # Check if we already have a local profile
        result = await self.db.execute(select(Profile).where(Profile.id == user_id))
        profile = result.scalar_one_or_none()
        is_new_user = profile is None

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

        # Handle referral (only for new users)
        referred_by_id = None
        invitation = None
        if is_new_user and referral_code:
            referred_by_id, invitation = await self._process_referral(
                referral_code, profile.id, profile.email
            )
            if referred_by_id:
                profile.referred_by = referred_by_id
                await self.db.flush()

        # Award registration points (only for new users)
        if is_new_user:
            await self._award_registration_points(
                profile.id, referred_by_id, invitation
            )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
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

    async def _award_registration_points(
        self,
        user_id: uuid.UUID,
        referred_by_id: uuid.UUID | None,
        invitation: object | None,
    ) -> None:
        """
        Award points on registration:
        - New user gets POINTS_REGISTRATION (5 pts) for signing up
        - Referrer gets POINTS_REFERRAL_BONUS (10 pts) if code was used
        - Invitation is marked as verified + points_awarded
        """
        engine = GamificationEngine(self.db)

        # 1. Award points to the new user for signing up
        await engine.award_points(
            user_id=user_id,
            points=POINTS_REGISTRATION,
            action_type="registration",
            description="Bônus de cadastro: bem-vindo à Rede de Embaixadores!",
            reference_type="registration",
            idempotency_key=f"{user_id}:registration",
        )

        # 2. Award points to referrer if registration used a referral code
        if referred_by_id and invitation:
            await engine.award_points(
                user_id=referred_by_id,
                points=POINTS_REFERRAL_BONUS,
                action_type="referral_bonus",
                description="Bônus de indicação: um convidado se cadastrou!",
                reference_type="invitation",
                reference_id=invitation.id,
                idempotency_key=f"{referred_by_id}:referral_bonus:{invitation.id}",
            )

            # Mark invitation as verified + points awarded
            invitation.status = "verified"
            invitation.points_awarded = True
            invitation.verified_at = datetime.now(timezone.utc)

        await self.db.flush()

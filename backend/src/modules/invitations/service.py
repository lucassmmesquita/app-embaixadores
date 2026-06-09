"""
═══════════════════════════════════════════════════════════════
  Invitations Module — Service
  PRD §4.1 INVITE: Convidar novo voluntário (30 pts por convite validado)
  PRD §4.3: Anti self-invite, anti-duplicate, pontua só após verificação
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.gamification.engine import GamificationEngine
from src.modules.invitations.models import Invitation
from src.modules.invitations.schemas import InviteCreate
from src.modules.users.models import Profile
from src.shared.exceptions import BadRequestException, ConflictException, NotFoundException
from src.shared.rate_limiter import rate_limiter


# Default points for validated invite (configurable via mission_templates)
INVITE_POINTS_DEFAULT = 30


class InvitationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_invitation(
        self, inviter_id: uuid.UUID, data: InviteCreate
    ) -> Invitation:
        """
        Create a trackable invitation.
        PRD §4.3: Anti self-invite + anti-duplicate + rate limiting.
        """
        if not data.invitee_email and not data.invitee_phone:
            raise BadRequestException("Informe o e-mail ou telefone do convidado")

        # Rate limiting
        rate_limiter.check(inviter_id, "invite_create")

        # PRD §4.3: Anti self-invite — block invite to own email/phone
        inviter_result = await self.db.execute(
            select(Profile).where(Profile.id == inviter_id)
        )
        inviter = inviter_result.scalar_one_or_none()
        if not inviter:
            raise NotFoundException("Perfil do convidante não encontrado")

        if data.invitee_email and inviter.email == data.invitee_email:
            raise BadRequestException("Você não pode convidar a si mesmo")
        if data.invitee_phone and inviter.phone and inviter.phone == data.invitee_phone:
            raise BadRequestException("Você não pode convidar a si mesmo")

        # PRD §4.3: Block duplicate invites
        if data.invitee_email:
            existing = await self.db.execute(
                select(Invitation).where(
                    Invitation.inviter_id == inviter_id,
                    Invitation.invitee_email == data.invitee_email,
                )
            )
            if existing.scalar_one_or_none():
                raise ConflictException("Convite já enviado para este e-mail")

            # Check if already registered
            existing_user = await self.db.execute(
                select(Profile).where(Profile.email == data.invitee_email)
            )
            if existing_user.scalar_one_or_none():
                raise ConflictException("Este e-mail já está cadastrado na plataforma")

        if data.invitee_phone:
            existing = await self.db.execute(
                select(Invitation).where(
                    Invitation.inviter_id == inviter_id,
                    Invitation.invitee_phone == data.invitee_phone,
                )
            )
            if existing.scalar_one_or_none():
                raise ConflictException("Convite já enviado para este telefone")

        # Generate unique invite code
        invite_code = str(uuid.uuid4())[:8].upper()

        invitation = Invitation(
            inviter_id=inviter_id,
            invitee_email=data.invitee_email,
            invitee_phone=data.invitee_phone,
            invite_code=invite_code,
            status="pending",
        )
        self.db.add(invitation)
        await self.db.flush()
        return invitation

    async def validate_invitation(self, invite_code: str, invitee_id: uuid.UUID) -> dict:
        """
        Validate an invitation when the invitee verifies their account.
        PRD §4.3: Convite só pontua quando o convidado VERIFICA a conta.
        """
        result = await self.db.execute(
            select(Invitation).where(Invitation.invite_code == invite_code)
        )
        invitation = result.scalar_one_or_none()
        if not invitation:
            raise NotFoundException("Código de convite não encontrado")

        if invitation.status == "verified":
            return {"message": "Convite já validado", "already_validated": True}

        invitation.status = "verified"
        invitation.invitee_id = invitee_id
        invitation.verified_at = datetime.now(timezone.utc)

        # PRD §4.3: Award points to inviter ONLY after verification
        gamification_result = None
        if not invitation.points_awarded:
            invitation.points_awarded = True
            engine = GamificationEngine(self.db)
            gamification_result = await engine.award_points(
                user_id=invitation.inviter_id,
                points=INVITE_POINTS_DEFAULT,
                action_type="invite_validated",
                description="Convite validado: convidado verificou a conta",
                reference_type="invitation",
                reference_id=invitation.id,
                idempotency_key=f"{invitation.inviter_id}:invitation:{invitation.id}",
            )

        await self.db.flush()
        return {
            "message": "Convite validado com sucesso",
            "inviter_points": gamification_result,
        }

    async def get_user_invitations(self, user_id: uuid.UUID) -> dict:
        """Get all invitations sent by a user with tracking stats."""
        result = await self.db.execute(
            select(Invitation)
            .where(Invitation.inviter_id == user_id)
            .order_by(Invitation.created_at.desc())
        )
        invitations = list(result.scalars().all())

        pending = sum(1 for i in invitations if i.status == "pending")
        registered = sum(1 for i in invitations if i.status == "registered")
        verified = sum(1 for i in invitations if i.status == "verified")

        return {
            "total_invites": len(invitations),
            "pending": pending,
            "registered": registered,
            "verified": verified,
            "invitations": invitations,
        }

    async def record_share(self, inviter_id: uuid.UUID, referral_code: str | None) -> Invitation:
        """
        Record a share action — creates a pending invitation entry.
        Each share creates a new record so the inviter can see when they shared.
        """
        if not referral_code:
            raise BadRequestException(
                "Código de indicação não encontrado. Atualize seu perfil."
            )

        # Rate limiting
        rate_limiter.check(inviter_id, "invite_create")

        code = referral_code  # Use the user's referral_code

        invitation = Invitation(
            inviter_id=inviter_id,
            invite_code=code,
            status="pending",
        )
        self.db.add(invitation)
        await self.db.flush()
        return invitation

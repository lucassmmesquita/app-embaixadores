"""
═══════════════════════════════════════════════════════════════
  Users Module — Service Layer
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.users.models import Consent, Level, Profile, Region
from src.modules.users.schemas import ConsentCreate, DeleteAccountRequest, ProfileUpdate
from src.shared.exceptions import BadRequestException, NotFoundException
from src.shared.pagination import PaginatedResponse, PaginationParams


class UserService:
    """Business logic for user operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_profile(self, user_id: uuid.UUID) -> Profile:
        """Get a user profile by ID with level data."""
        result = await self.db.execute(
            select(Profile)
            .options(selectinload(Profile.current_level))
            .where(Profile.id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise NotFoundException("Perfil não encontrado")
        return profile

    async def update_profile(self, user_id: uuid.UUID, data: ProfileUpdate) -> Profile:
        """Update user profile fields."""
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_profile(user_id)

        await self.db.execute(
            update(Profile).where(Profile.id == user_id).values(**update_data)
        )
        await self.db.flush()
        return await self.get_profile(user_id)

    async def list_users(
        self,
        params: PaginationParams,
        role: str | None = None,
        level_id: uuid.UUID | None = None,
        region_id: uuid.UUID | None = None,
        search: str | None = None,
        is_active: bool | None = None,
    ) -> PaginatedResponse:
        """List users with filters and pagination."""
        query = select(Profile).options(selectinload(Profile.current_level))
        count_query = select(func.count(Profile.id))

        # Filters
        if role:
            query = query.where(Profile.role == role)
            count_query = count_query.where(Profile.role == role)
        if level_id:
            query = query.where(Profile.current_level_id == level_id)
            count_query = count_query.where(Profile.current_level_id == level_id)
        if region_id:
            query = query.where(Profile.region_id == region_id)
            count_query = count_query.where(Profile.region_id == region_id)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                Profile.full_name.ilike(search_filter) | Profile.email.ilike(search_filter)
            )
            count_query = count_query.where(
                Profile.full_name.ilike(search_filter) | Profile.email.ilike(search_filter)
            )

        # Active filter (default: show all)
        if is_active is not None:
            query = query.where(Profile.is_active.is_(is_active))
            count_query = count_query.where(Profile.is_active.is_(is_active))

        # Count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.order_by(Profile.created_at.desc()).offset(params.offset).limit(params.page_size)
        result = await self.db.execute(query)
        users = list(result.scalars().all())

        return PaginatedResponse.create(items=users, total=total, params=params)

    async def get_levels(self) -> list[Level]:
        """Get all levels ordered by progression."""
        result = await self.db.execute(select(Level).order_by(Level.order_index))
        return list(result.scalars().all())

    async def get_regions(self) -> list[Region]:
        """Get all active regions."""
        result = await self.db.execute(
            select(Region).where(Region.is_active.is_(True)).order_by(Region.name)
        )
        return list(result.scalars().all())

    async def generate_referral_code(self, user_id: uuid.UUID) -> str:
        """Generate a unique referral code for a user."""
        code = str(uuid.uuid4())[:8].upper()
        await self.db.execute(
            update(Profile).where(Profile.id == user_id).values(referral_code=code)
        )
        return code

    # ═══ CONSENT MANAGEMENT (LGPD §8.1) ═══

    async def record_consent(self, user_id: uuid.UUID, data: ConsentCreate) -> Consent:
        """
        Record a granular LGPD consent.
        PRD §8.1: Each consent has type, version, and timestamp.
        """
        valid_types = {"data_processing", "communication", "public_ranking"}
        if data.consent_type not in valid_types:
            raise BadRequestException(
                f"Tipo de consentimento inválido. Opções: {', '.join(valid_types)}"
            )

        # Check for existing consent of same type
        existing = await self.db.execute(
            select(Consent).where(
                Consent.user_id == user_id,
                Consent.consent_type == data.consent_type,
                Consent.revoked_at.is_(None),
            )
        )
        existing_consent = existing.scalar_one_or_none()

        if existing_consent:
            # Update existing consent
            existing_consent.granted = data.granted
            existing_consent.version = data.version
            existing_consent.granted_at = datetime.now(timezone.utc)
            await self.db.flush()
            return existing_consent

        consent = Consent(
            user_id=user_id,
            consent_type=data.consent_type,
            version=data.version,
            granted=data.granted,
            granted_at=datetime.now(timezone.utc),
        )
        self.db.add(consent)
        await self.db.flush()
        return consent

    async def revoke_consent(self, user_id: uuid.UUID, consent_type: str) -> dict:
        """
        Revoke a specific consent type.
        PRD §8.1: Users can revoke consent at any time.
        """
        result = await self.db.execute(
            select(Consent).where(
                Consent.user_id == user_id,
                Consent.consent_type == consent_type,
                Consent.revoked_at.is_(None),
            )
        )
        consent = result.scalar_one_or_none()
        if not consent:
            raise NotFoundException("Consentimento não encontrado")

        consent.granted = False
        consent.revoked_at = datetime.now(timezone.utc)
        await self.db.flush()
        return {"message": f"Consentimento '{consent_type}' revogado com sucesso"}

    async def get_user_consents(self, user_id: uuid.UUID) -> list[Consent]:
        """Get all active consents for a user."""
        result = await self.db.execute(
            select(Consent)
            .where(Consent.user_id == user_id)
            .order_by(Consent.granted_at.desc())
        )
        return list(result.scalars().all())

    async def delete_account(self, user_id: uuid.UUID, data: DeleteAccountRequest) -> dict:
        """
        LGPD §8.1: Delete user account with data anonymization.
        Preserves aggregate data integrity (anonymized historical records).
        """
        if data.confirmation != "EXCLUIR MINHA CONTA":
            raise BadRequestException(
                "Para confirmar a exclusão, digite 'EXCLUIR MINHA CONTA'"
            )

        profile = await self.get_profile(user_id)

        # Anonymize profile data — preserve structure for aggregate integrity
        profile.full_name = "Usuário Removido"
        profile.email = f"deleted_{user_id}@removed.local"
        profile.phone = None
        profile.cpf = None
        profile.avatar_url = None
        profile.bio = None
        profile.birth_date = None
        profile.gender = None
        profile.neighborhood = None
        profile.city = None
        profile.zip_code = None
        profile.latitude = None
        profile.longitude = None
        profile.is_active = False

        # Revoke all consents
        await self.db.execute(
            update(Consent)
            .where(Consent.user_id == user_id, Consent.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc), granted=False)
        )

        await self.db.flush()
        return {
            "message": "Conta excluída e dados anonimizados conforme LGPD",
            # // LEGAL-REVIEW: Verificar se a anonimização atende todos os requisitos legais
        }

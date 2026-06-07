"""
═══════════════════════════════════════════════════════════════
  Users Module — Service Layer
═══════════════════════════════════════════════════════════════
"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.users.models import Level, Profile, Region
from src.modules.users.schemas import ProfileUpdate
from src.shared.exceptions import NotFoundException
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

        # Only active users
        query = query.where(Profile.is_active.is_(True))
        count_query = count_query.where(Profile.is_active.is_(True))

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

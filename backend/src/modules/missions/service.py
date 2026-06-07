"""
═══════════════════════════════════════════════════════════════
  Missions Module — Service
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.gamification.engine import GamificationEngine
from src.modules.missions.models import Mission, MissionCategory, UserMission
from src.modules.missions.schemas import MissionCreate, MissionUpdate
from src.shared.exceptions import BadRequestException, ConflictException, NotFoundException
from src.shared.pagination import PaginatedResponse, PaginationParams


class MissionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_missions(
        self,
        params: PaginationParams,
        category_id: uuid.UUID | None = None,
        mission_type: str | None = None,
        is_featured: bool | None = None,
        user_id: uuid.UUID | None = None,
    ) -> PaginatedResponse:
        """List available missions with filters."""
        query = select(Mission).options(selectinload(Mission.category))
        count_query = select(func.count(Mission.id))

        # Only active
        query = query.where(Mission.is_active.is_(True))
        count_query = count_query.where(Mission.is_active.is_(True))

        if category_id:
            query = query.where(Mission.category_id == category_id)
            count_query = count_query.where(Mission.category_id == category_id)
        if mission_type:
            query = query.where(Mission.mission_type == mission_type)
            count_query = count_query.where(Mission.mission_type == mission_type)
        if is_featured is not None:
            query = query.where(Mission.is_featured == is_featured)
            count_query = count_query.where(Mission.is_featured == is_featured)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Mission.is_featured.desc(), Mission.created_at.desc())
        query = query.offset(params.offset).limit(params.page_size)

        result = await self.db.execute(query)
        missions = list(result.scalars().all())

        return PaginatedResponse.create(items=missions, total=total, params=params)

    async def get_mission(self, mission_id: uuid.UUID) -> Mission:
        result = await self.db.execute(
            select(Mission).options(selectinload(Mission.category)).where(Mission.id == mission_id)
        )
        mission = result.scalar_one_or_none()
        if not mission:
            raise NotFoundException("Missão não encontrada")
        return mission

    async def start_mission(self, user_id: uuid.UUID, mission_id: uuid.UUID) -> UserMission:
        """Start a mission for a user."""
        # Check if already started
        existing = await self.db.execute(
            select(UserMission).where(
                UserMission.user_id == user_id, UserMission.mission_id == mission_id
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictException("Você já iniciou esta missão")

        mission = await self.get_mission(mission_id)
        user_mission = UserMission(
            user_id=user_id,
            mission_id=mission_id,
            status="in_progress",
        )
        self.db.add(user_mission)
        await self.db.flush()
        return user_mission

    async def submit_mission(
        self,
        user_id: uuid.UUID,
        mission_id: uuid.UUID,
        evidence_url: str | None = None,
    ) -> dict:
        """Submit a mission completion."""
        result = await self.db.execute(
            select(UserMission)
            .options(selectinload(UserMission.mission))
            .where(UserMission.user_id == user_id, UserMission.mission_id == mission_id)
        )
        user_mission = result.scalar_one_or_none()
        if not user_mission:
            raise NotFoundException("Missão não iniciada")

        if user_mission.status == "completed":
            raise BadRequestException("Missão já completada")

        mission = user_mission.mission
        user_mission.progress_count += 1
        user_mission.evidence_url = evidence_url

        if mission.requires_verification:
            user_mission.status = "pending_verification"
        elif user_mission.progress_count >= mission.required_count:
            user_mission.status = "completed"
            user_mission.completed_at = datetime.now(timezone.utc)
            user_mission.points_awarded = mission.points_reward

            # Award points via gamification engine
            engine = GamificationEngine(self.db)
            result = await engine.award_points(
                user_id=user_id,
                points=mission.points_reward,
                action_type="mission_complete",
                description=f"Missão completada: {mission.title}",
                reference_type="mission",
                reference_id=mission_id,
            )
            await self.db.flush()
            return {"status": "completed", "gamification": result}

        await self.db.flush()
        return {"status": user_mission.status, "progress": user_mission.progress_count}

    async def get_user_missions(self, user_id: uuid.UUID) -> list[UserMission]:
        result = await self.db.execute(
            select(UserMission)
            .options(selectinload(UserMission.mission).selectinload(Mission.category))
            .where(UserMission.user_id == user_id)
            .order_by(UserMission.started_at.desc())
        )
        return list(result.scalars().all())

    async def get_categories(self) -> list[MissionCategory]:
        result = await self.db.execute(
            select(MissionCategory).order_by(MissionCategory.order_index)
        )
        return list(result.scalars().all())

    async def create_mission(self, data: MissionCreate) -> Mission:
        """Admin: create a new mission."""
        mission = Mission(**data.model_dump())
        self.db.add(mission)
        await self.db.flush()
        return mission

    async def update_mission(self, mission_id: uuid.UUID, data: MissionUpdate) -> Mission:
        """Admin: update a mission."""
        mission = await self.get_mission(mission_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(mission, key, value)
        await self.db.flush()
        return mission

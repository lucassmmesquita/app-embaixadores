"""
═══════════════════════════════════════════════════════════════
  Missions Module — Service
  PRD §4.2: Full state machine AVAILABLE → IN_PROGRESS → SUBMITTED → (VALIDATED | REJECTED) → COMPLETED
  PRD §4.3: Anti-fraud rules — rate limiting, idempotency
  PRD §4.4: Recurrence — ONE_TIME, DAILY, WEEKLY, PER_EVENT
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.gamification.engine import GamificationEngine
from src.modules.invitations.models import Invitation
from src.modules.missions.models import Mission, MissionCategory, UserMission
from src.modules.missions.schemas import MissionCreate, MissionUpdate
from src.shared.exceptions import BadRequestException, ConflictException, NotFoundException
from src.shared.pagination import PaginatedResponse, PaginationParams
from src.shared.rate_limiter import rate_limiter

# Points awarded to inviter when invitee completes first mission
INVITE_VERIFY_POINTS = 30


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
            query = query.where(Mission.action_type == mission_type)
            count_query = count_query.where(Mission.action_type == mission_type)
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
        """
        Start a mission for a user.
        PRD §4.4: Recurrence logic — allow re-start for recurring missions.
        """
        mission = await self.get_mission(mission_id)

        # Check recurrence rules
        existing = await self.db.execute(
            select(UserMission).where(
                UserMission.user_id == user_id, UserMission.mission_id == mission_id
            ).order_by(UserMission.started_at.desc())
        )
        last_attempt = existing.scalar_one_or_none()

        if last_attempt:
            if mission.recurrence == "ONE_TIME":
                if last_attempt.status in ("in_progress", "submitted", "completed"):
                    raise ConflictException("Você já iniciou esta missão")
                # Allow restart if rejected
                if last_attempt.status == "rejected" and last_attempt.submission_count >= mission.max_submissions:
                    raise BadRequestException(
                        f"Limite de {mission.max_submissions} tentativas atingido"
                    )

            elif mission.recurrence == "DAILY":
                if last_attempt.started_at.date() == datetime.now(timezone.utc).date():
                    if last_attempt.status in ("in_progress", "submitted", "completed"):
                        raise ConflictException("Você já realizou esta missão hoje")

            elif mission.recurrence == "WEEKLY":
                week_ago = datetime.now(timezone.utc) - timedelta(days=7)
                if last_attempt.started_at >= week_ago:
                    if last_attempt.status in ("in_progress", "submitted", "completed"):
                        raise ConflictException("Você já realizou esta missão esta semana")

        # PRD §4.3: Rate limiting
        if mission.max_daily_completions > 0:
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            completed_today = await self.db.execute(
                select(func.count(UserMission.id)).where(
                    UserMission.user_id == user_id,
                    UserMission.mission_id == mission_id,
                    UserMission.status == "completed",
                    UserMission.completed_at >= today_start,
                )
            )
            if (completed_today.scalar() or 0) >= mission.max_daily_completions:
                raise BadRequestException(
                    f"Limite de {mission.max_daily_completions} completações diárias atingido"
                )

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
        notes: str | None = None,
    ) -> dict:
        """
        Submit a mission completion.
        PRD §4.2: Full state machine with verification flow.
        PRD §4.3: Rate limiting per user per action type.
        """
        # Rate limit check
        rate_limiter.check(user_id, "mission_submit")

        result = await self.db.execute(
            select(UserMission)
            .options(selectinload(UserMission.mission))
            .where(UserMission.user_id == user_id, UserMission.mission_id == mission_id)
            .order_by(UserMission.started_at.desc())
        )
        user_mission = result.scalars().first()
        if not user_mission:
            raise NotFoundException("Missão não iniciada")

        if user_mission.status == "completed":
            raise BadRequestException("Missão já completada")

        if user_mission.status == "submitted":
            raise BadRequestException("Missão já submetida e aguardando validação")

        mission = user_mission.mission

        # Check re-submission limit (PRD §4.2)
        if user_mission.status == "rejected":
            if user_mission.submission_count >= mission.max_submissions:
                raise BadRequestException(
                    f"Limite de {mission.max_submissions} tentativas atingido para esta missão"
                )

        user_mission.progress_count += 1
        user_mission.evidence_url = evidence_url
        user_mission.notes = notes
        user_mission.submission_count += 1
        user_mission.submitted_at = datetime.now(timezone.utc)

        if mission.requires_verification:
            # PRD §4.2: Missions with async validation → SUBMITTED
            user_mission.status = "submitted"
            await self.db.flush()
            return {"status": "submitted", "message": "Missão submetida para validação"}

        elif mission.is_self_declared:
            # PRD §4.2: Self-declared low-weight missions → COMPLETED directly
            user_mission.status = "completed"
            user_mission.completed_at = datetime.now(timezone.utc)
            user_mission.points_awarded = mission.points_reward

            engine = GamificationEngine(self.db)
            gamification_result = await engine.award_points(
                user_id=user_id,
                points=mission.points_reward,
                action_type="mission_complete",
                description=f"Missão completada: {mission.title}",
                reference_type="mission",
                reference_id=mission_id,
                idempotency_key=f"{user_id}:mission:{mission_id}:{user_mission.id}",
            )
            await self.db.flush()
            # Verify invitation on first mission completion
            await self._verify_invitation_on_completion(user_id)
            return {"status": "completed", "gamification": gamification_result}

        elif user_mission.progress_count >= mission.required_count:
            # Standard completion
            user_mission.status = "completed"
            user_mission.completed_at = datetime.now(timezone.utc)
            user_mission.points_awarded = mission.points_reward

            engine = GamificationEngine(self.db)
            gamification_result = await engine.award_points(
                user_id=user_id,
                points=mission.points_reward,
                action_type="mission_complete",
                description=f"Missão completada: {mission.title}",
                reference_type="mission",
                reference_id=mission_id,
                idempotency_key=f"{user_id}:mission:{mission_id}:{user_mission.id}",
            )
            await self.db.flush()
            # Verify invitation on first mission completion
            await self._verify_invitation_on_completion(user_id)
            return {"status": "completed", "gamification": gamification_result}

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

    async def _verify_invitation_on_completion(self, user_id: uuid.UUID) -> None:
        """
        When a user completes their first mission, verify their invitation
        (change status from 'registered' to 'verified') and award points to inviter.
        """
        # Find invitation where this user is the invitee and status is 'registered'
        result = await self.db.execute(
            select(Invitation).where(
                Invitation.invitee_id == user_id,
                Invitation.status == "registered",
            )
        )
        invitation = result.scalar_one_or_none()
        if not invitation:
            return  # No invitation to verify

        # Mark as verified
        invitation.status = "verified"
        invitation.verified_at = datetime.now(timezone.utc)

        # Award points to inviter (only once)
        if not invitation.points_awarded:
            invitation.points_awarded = True
            engine = GamificationEngine(self.db)
            await engine.award_points(
                user_id=invitation.inviter_id,
                points=INVITE_VERIFY_POINTS,
                action_type="invite_validated",
                description="Convite validado: convidado completou primeira missão",
                reference_type="invitation",
                reference_id=invitation.id,
                idempotency_key=f"{invitation.inviter_id}:invitation:{invitation.id}",
            )

        await self.db.flush()

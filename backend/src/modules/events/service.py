"""
═══════════════════════════════════════════════════════════════
  Events Module — Service
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.events.models import Event, EventParticipant
from src.modules.events.schemas import EventCreate, EventUpdate
from src.modules.gamification.engine import GamificationEngine
from src.shared.exceptions import BadRequestException, ConflictException, NotFoundException
from src.shared.pagination import PaginatedResponse, PaginationParams


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_events(
        self,
        params: PaginationParams,
        event_type: str | None = None,
        region_id: uuid.UUID | None = None,
        upcoming_only: bool = True,
    ) -> PaginatedResponse:
        query = select(Event).where(Event.is_active.is_(True))
        count_query = select(func.count(Event.id)).where(Event.is_active.is_(True))

        if event_type:
            query = query.where(Event.event_type == event_type)
            count_query = count_query.where(Event.event_type == event_type)
        if region_id:
            query = query.where(Event.region_id == region_id)
            count_query = count_query.where(Event.region_id == region_id)
        if upcoming_only:
            now = datetime.now(timezone.utc)
            query = query.where(Event.start_datetime >= now)
            count_query = count_query.where(Event.start_datetime >= now)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Event.start_datetime.asc()).offset(params.offset).limit(params.page_size)

        result = await self.db.execute(query)
        events = list(result.scalars().all())
        return PaginatedResponse.create(items=events, total=total, params=params)

    async def get_event(self, event_id: uuid.UUID) -> Event:
        result = await self.db.execute(
            select(Event).options(selectinload(Event.participants)).where(Event.id == event_id)
        )
        event = result.scalar_one_or_none()
        if not event:
            raise NotFoundException("Evento não encontrado")
        return event

    async def register_for_event(self, user_id: uuid.UUID, event_id: uuid.UUID) -> EventParticipant:
        event = await self.get_event(event_id)

        # Check capacity
        if event.max_capacity:
            participant_count = await self.db.execute(
                select(func.count(EventParticipant.id)).where(EventParticipant.event_id == event_id)
            )
            count = participant_count.scalar() or 0
            if count >= event.max_capacity:
                raise BadRequestException("Evento lotado")

        # Check if already registered
        existing = await self.db.execute(
            select(EventParticipant).where(
                EventParticipant.event_id == event_id, EventParticipant.user_id == user_id
            )
        )
        if existing.scalar_one_or_none():
            raise ConflictException("Você já está inscrito neste evento")

        participant = EventParticipant(event_id=event_id, user_id=user_id, status="registered")
        self.db.add(participant)
        await self.db.flush()
        return participant

    async def checkin(self, user_id: uuid.UUID, event_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(EventParticipant).where(
                EventParticipant.event_id == event_id, EventParticipant.user_id == user_id
            )
        )
        participant = result.scalar_one_or_none()
        if not participant:
            raise NotFoundException("Inscrição não encontrada")

        participant.status = "attended"
        participant.check_in_at = datetime.now(timezone.utc)

        # Award points
        event = await self.get_event(event_id)
        gamification_result = None
        if event.points_reward > 0:
            engine = GamificationEngine(self.db)
            gamification_result = await engine.award_points(
                user_id=user_id,
                points=event.points_reward,
                action_type="event_attend",
                description=f"Check-in no evento: {event.title}",
                reference_type="event",
                reference_id=event_id,
            )

        await self.db.flush()
        return {"status": "attended", "gamification": gamification_result}

    async def create_event(self, data: EventCreate, created_by: uuid.UUID) -> Event:
        event = Event(**data.model_dump(), created_by=created_by)
        self.db.add(event)
        await self.db.flush()
        return event

    async def update_event(self, event_id: uuid.UUID, data: EventUpdate) -> Event:
        event = await self.get_event(event_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(event, key, value)
        await self.db.flush()
        return event

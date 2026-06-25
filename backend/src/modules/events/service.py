"""
═══════════════════════════════════════════════════════════════
  Events Module — Service
  PRD §4.3: Check-in com código do evento + janela temporal + raio geográfico
═══════════════════════════════════════════════════════════════
"""

import math
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.events.models import Event, EventParticipant
from src.modules.events.schemas import CheckinRequest, EventCreate, EventUpdate
from src.modules.gamification.engine import GamificationEngine
from src.modules.gamification.point_config import PointConfigService
from src.shared.exceptions import BadRequestException, ConflictException, NotFoundException
from src.shared.pagination import PaginatedResponse, PaginationParams
from src.shared.rate_limiter import rate_limiter


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_events(
        self,
        params: PaginationParams,
        event_type: str | None = None,
        region_id: uuid.UUID | None = None,
        upcoming_only: bool = True,
        include_inactive: bool = False,
        user_id: uuid.UUID | None = None,
    ) -> PaginatedResponse:
        from sqlalchemy import or_

        query = select(Event).options(selectinload(Event.participants))
        count_query = select(func.count(Event.id))

        if not include_inactive:
            query = query.where(Event.is_active.is_(True))
            count_query = count_query.where(Event.is_active.is_(True))

        if event_type:
            query = query.where(Event.event_type == event_type)
            count_query = count_query.where(Event.event_type == event_type)
        if region_id:
            query = query.where(Event.region_id == region_id)
            count_query = count_query.where(Event.region_id == region_id)
        if upcoming_only:
            now = datetime.now(timezone.utc)
            if user_id:
                # Include upcoming events OR past events where user is registered
                registered_event_ids = select(EventParticipant.event_id).where(
                    EventParticipant.user_id == user_id
                )
                upcoming_or_registered = or_(
                    Event.start_datetime >= now,
                    Event.id.in_(registered_event_ids),
                )
                query = query.where(upcoming_or_registered)
                count_query = count_query.where(upcoming_or_registered)
            else:
                query = query.where(Event.start_datetime >= now)
                count_query = count_query.where(Event.start_datetime >= now)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Event.start_datetime.desc()).offset(params.offset).limit(params.page_size)

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

    async def checkin(
        self, user_id: uuid.UUID, event_id: uuid.UUID, data: CheckinRequest
    ) -> dict:
        """
        Check-in at an event.
        Validation modes:
        - Event with geo: location is sufficient (code optional)
        - Event without geo: code is required
        """
        # Rate limit
        rate_limiter.check(user_id, "event_checkin")

        event = await self.get_event(event_id)

        has_geo = (
            event.latitude is not None
            and event.longitude is not None
        )
        # Default radius: 500m if not configured
        checkin_radius = event.checkin_radius_meters or 500 if has_geo else 0

        # 1. Validate check-in code
        if data.checkin_code:
            # If code provided, validate it
            if event.checkin_code and data.checkin_code != event.checkin_code:
                raise BadRequestException("Código de check-in inválido")
        elif not has_geo:
            # No code and no geo — code is required
            raise BadRequestException("Informe o código de check-in do evento")

        # 2. Validate temporal window (PRD §4.3)
        now = datetime.now(timezone.utc)
        if event.checkin_start and now < event.checkin_start:
            raise BadRequestException("Check-in ainda não aberto para este evento")
        if event.checkin_end and now > event.checkin_end:
            raise BadRequestException("Período de check-in encerrado")

        # 3. Validate geo radius
        if has_geo:
            # Require user to send their coordinates
            if data.latitude is None or data.longitude is None:
                raise BadRequestException(
                    "Este evento exige verificação de localização. "
                    "Ative o GPS e permita o acesso à sua localização."
                )
            distance = _haversine_distance(
                float(event.latitude), float(event.longitude),
                data.latitude, data.longitude,
            )
            if distance > checkin_radius:
                raise BadRequestException(
                    f"Você está muito longe do local do evento ({int(distance)}m). "
                    f"Distância máxima: {checkin_radius}m"
                )

        # Find participant registration
        result = await self.db.execute(
            select(EventParticipant).where(
                EventParticipant.event_id == event_id, EventParticipant.user_id == user_id
            )
        )
        participant = result.scalar_one_or_none()
        if not participant:
            raise NotFoundException("Inscrição não encontrada. Registre-se no evento primeiro.")

        if participant.status == "attended":
            raise ConflictException("Check-in já realizado")

        participant.status = "attended"
        participant.check_in_at = now

        # Award points (idempotent via engine)
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
                idempotency_key=f"{user_id}:event:{event_id}",
            )

        await self.db.flush()

        # System notification for check-in
        try:
            from src.modules.notifications.system_config import SystemNotificationService
            sys_notif = SystemNotificationService(self.db)
            await sys_notif.send_system_notification(
                "event_checkin", user_id,
                {"event_name": event.title, "points": event.points_reward},
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to send event_checkin notification: {e}")

        return {"status": "attended", "gamification": gamification_result}

    async def create_event(self, data: EventCreate, created_by: uuid.UUID) -> Event:
        """Admin: create event with auto-generated check-in code."""
        # Generate a random check-in code
        checkin_code = str(uuid.uuid4())[:6].upper()
        event = Event(
            **data.model_dump(),
            created_by=created_by,
            checkin_code=checkin_code,
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def update_event(self, event_id: uuid.UUID, data: EventUpdate) -> Event:
        event = await self.get_event(event_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(event, key, value)
        await self.db.flush()
        return event

    async def regenerate_checkin_code(self, event_id: uuid.UUID) -> str:
        """Admin: regenerate check-in code for an event."""
        event = await self.get_event(event_id)
        new_code = str(uuid.uuid4())[:6].upper()
        event.checkin_code = new_code
        await self.db.flush()
        return new_code

    async def share_event(
        self, user_id: uuid.UUID, event_id: uuid.UUID, platform: str = "whatsapp"
    ) -> dict:
        """
        Record an event share (no points awarded here).
        Points are awarded only when someone clicks the event landing page.
        """
        rate_limiter.check(user_id, "event_share")

        event = await self.get_event(event_id)

        return {
            "message": "Compartilhamento registrado",
            "points_awarded": 0,
        }

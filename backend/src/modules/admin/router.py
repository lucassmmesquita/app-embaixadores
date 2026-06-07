"""
═══════════════════════════════════════════════════════════════
  Admin Module — Router
  Administrative endpoints for campaign management.
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_admin
from src.modules.content.models import Content
from src.modules.events.models import Event, EventParticipant
from src.modules.events.schemas import EventCreate, EventUpdate
from src.modules.events.service import EventService
from src.modules.gamification.models import Activity
from src.modules.missions.models import Mission, UserMission
from src.modules.missions.schemas import MissionCreate, MissionUpdate
from src.modules.missions.service import MissionService
from src.modules.notifications.models import Notification
from src.modules.users.models import Profile
from src.modules.users.schemas import ProfileResponse
from src.modules.users.service import UserService
from src.shared.pagination import PaginationParams

router = APIRouter()


# ═══ DASHBOARD ═══
@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get campaign dashboard statistics."""
    # Total users
    total_users = (await db.execute(
        select(func.count(Profile.id)).where(Profile.is_active.is_(True))
    )).scalar() or 0

    # New users this week (last 7 days)
    from datetime import datetime, timedelta, timezone
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_users_week = (await db.execute(
        select(func.count(Profile.id)).where(Profile.created_at >= week_ago)
    )).scalar() or 0

    # Total points awarded
    total_points = (await db.execute(
        select(func.sum(Activity.points_awarded))
    )).scalar() or 0

    # Total missions completed
    missions_completed = (await db.execute(
        select(func.count(UserMission.id)).where(UserMission.status == "completed")
    )).scalar() or 0

    # Total events
    total_events = (await db.execute(
        select(func.count(Event.id)).where(Event.is_active.is_(True))
    )).scalar() or 0

    # Active missions
    active_missions = (await db.execute(
        select(func.count(Mission.id)).where(Mission.is_active.is_(True))
    )).scalar() or 0

    # Users per level
    users_per_level = []
    from src.modules.users.models import Level
    levels_result = await db.execute(
        select(Level).order_by(Level.order_index)
    )
    for level in levels_result.scalars().all():
        count = (await db.execute(
            select(func.count(Profile.id)).where(Profile.current_level_id == level.id)
        )).scalar() or 0
        users_per_level.append({
            "level_name": level.name,
            "level_color": level.color,
            "count": count,
        })

    # Recent activities
    recent = await db.execute(
        select(Activity).order_by(Activity.created_at.desc()).limit(10)
    )

    return {
        "total_users": total_users,
        "new_users_week": new_users_week,
        "total_points_awarded": total_points,
        "missions_completed": missions_completed,
        "total_events": total_events,
        "active_missions": active_missions,
        "users_per_level": users_per_level,
        "recent_activities": list(recent.scalars().all()),
    }


# ═══ USERS MANAGEMENT ═══
@router.get("/users")
async def list_users(
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: str | None = None,
    level_id: uuid.UUID | None = None,
    region_id: uuid.UUID | None = None,
    search: str | None = None,
):
    """Admin: List all users with filters."""
    service = UserService(db)
    params = PaginationParams(page=page, page_size=page_size)
    return await service.list_users(
        params=params, role=role, level_id=level_id, region_id=region_id, search=search
    )


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    role: str = Query(...),
):
    """Admin: Update a user's role."""
    valid_roles = {"participant", "moderator", "coordinator", "admin", "super_admin"}
    if role not in valid_roles:
        from src.shared.exceptions import BadRequestException
        raise BadRequestException(f"Role inválido. Opções: {', '.join(valid_roles)}")

    from sqlalchemy import update
    await db.execute(
        update(Profile).where(Profile.id == user_id).values(role=role)
    )
    return {"message": f"Role atualizado para {role}"}


# ═══ MISSIONS MANAGEMENT ═══
@router.post("/missions")
async def create_mission(
    data: MissionCreate,
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: Create a new mission."""
    service = MissionService(db)
    mission = await service.create_mission(data)
    return {"message": "Missão criada", "mission_id": str(mission.id)}


@router.patch("/missions/{mission_id}")
async def update_mission(
    mission_id: uuid.UUID,
    data: MissionUpdate,
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: Update a mission."""
    service = MissionService(db)
    await service.update_mission(mission_id, data)
    return {"message": "Missão atualizada"}


@router.post("/missions/{mission_id}/verify")
async def verify_mission(
    mission_id: uuid.UUID,
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    user_id: uuid.UUID = Query(...),
    approved: bool = Query(default=True),
):
    """Admin: Verify a mission submission."""
    from datetime import datetime, timezone
    from sqlalchemy import update as sql_update
    from src.modules.gamification.engine import GamificationEngine

    result = await db.execute(
        select(UserMission)
        .where(UserMission.user_id == user_id, UserMission.mission_id == mission_id)
    )
    user_mission = result.scalar_one_or_none()
    if not user_mission:
        from src.shared.exceptions import NotFoundException
        raise NotFoundException("Submissão não encontrada")

    if approved:
        user_mission.status = "completed"
        user_mission.completed_at = datetime.now(timezone.utc)
        user_mission.verified_at = datetime.now(timezone.utc)
        user_mission.verified_by = current_admin.id

        # Get mission for points
        mission = await db.execute(select(Mission).where(Mission.id == mission_id))
        mission_obj = mission.scalar_one()
        user_mission.points_awarded = mission_obj.points_reward

        engine = GamificationEngine(db)
        await engine.award_points(
            user_id=user_id,
            points=mission_obj.points_reward,
            action_type="mission_verified",
            description=f"Missão verificada: {mission_obj.title}",
            reference_type="mission",
            reference_id=mission_id,
        )
    else:
        user_mission.status = "in_progress"
        user_mission.progress_count = 0

    return {"message": "Missão verificada" if approved else "Missão rejeitada"}


# ═══ EVENTS MANAGEMENT ═══
@router.post("/events")
async def create_event(
    data: EventCreate,
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: Create a new event."""
    service = EventService(db)
    event = await service.create_event(data, current_admin.id)
    return {"message": "Evento criado", "event_id": str(event.id)}


@router.patch("/events/{event_id}")
async def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: Update an event."""
    service = EventService(db)
    await service.update_event(event_id, data)
    return {"message": "Evento atualizado"}


# ═══ NOTIFICATIONS ═══
@router.post("/notifications/send")
async def send_notification(
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    title: str = Query(...),
    body: str = Query(...),
    notification_type: str = Query(default="info"),
    target_level_id: uuid.UUID | None = None,
    target_region_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
):
    """Admin: Send a notification (targeted or broadcast)."""
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        target_level_id=target_level_id,
        target_region_id=target_region_id,
    )
    db.add(notification)
    return {"message": "Notificação enviada"}


# ═══ ANALYTICS ═══
@router.get("/analytics/engagement")
async def get_engagement_analytics(
    current_admin: Annotated[Profile, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, ge=1, le=365),
):
    """Admin: Get engagement analytics for the specified period."""
    from datetime import datetime, timedelta, timezone

    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Activities per day
    daily_activities = await db.execute(
        select(
            func.date_trunc("day", Activity.created_at).label("date"),
            func.count(Activity.id).label("count"),
            func.sum(Activity.points_awarded).label("points"),
        )
        .where(Activity.created_at >= start_date)
        .group_by(func.date_trunc("day", Activity.created_at))
        .order_by(func.date_trunc("day", Activity.created_at))
    )

    # New registrations per day
    daily_registrations = await db.execute(
        select(
            func.date_trunc("day", Profile.created_at).label("date"),
            func.count(Profile.id).label("count"),
        )
        .where(Profile.created_at >= start_date)
        .group_by(func.date_trunc("day", Profile.created_at))
        .order_by(func.date_trunc("day", Profile.created_at))
    )

    return {
        "period_days": days,
        "daily_activities": [
            {"date": str(row.date), "count": row.count, "points": row.points}
            for row in daily_activities
        ],
        "daily_registrations": [
            {"date": str(row.date), "count": row.count}
            for row in daily_registrations
        ],
    }

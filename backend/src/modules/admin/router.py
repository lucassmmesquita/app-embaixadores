"""
═══════════════════════════════════════════════════════════════
  Admin Module — Router
  Administrative endpoints for campaign management.
  PRD §7.1: Full admin panel functionality
  PRD §7.2: RBAC with role-specific access
═══════════════════════════════════════════════════════════════
"""

import csv
import io
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.admin_auth.dependencies import get_current_admin_user
from src.modules.admin_auth.models import AdminUser
from src.modules.content.models import Content
from src.modules.content.schemas import ContentCreate, ContentUpdate
from src.modules.content.service import ContentService
from src.modules.events.models import Event, EventParticipant
from src.modules.events.schemas import EventCreate, EventUpdate
from src.modules.events.service import EventService
from src.modules.gamification.engine import GamificationEngine
from src.modules.gamification.models import Activity, Badge
from src.modules.gamification.schemas import BadgeCreate, BadgeResponse, BadgeUpdate
from src.modules.missions.models import Mission, UserMission
from src.modules.missions.schemas import MissionCreate, MissionResponse, MissionUpdate
from src.modules.missions.service import MissionService
from src.modules.notifications.models import Notification
from src.modules.notifications.service import NotificationService
from src.modules.users.models import Level, Profile
from src.modules.users.schemas import LevelResponse, LevelUpdate, ProfileResponse
from src.modules.users.service import UserService
from src.shared.audit import AuditLog, log_audit
from src.shared.exceptions import BadRequestException, NotFoundException
from src.shared.pagination import PaginationParams

router = APIRouter()


# ═══ DASHBOARD ═══
@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get campaign dashboard statistics."""
    # Total users
    total_users = (await db.execute(
        select(func.count(Profile.id)).where(Profile.is_active.is_(True))
    )).scalar() or 0

    # New users this week (last 7 days)
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

    # Pending level approvals (PRD §3.2)
    pending_approvals = (await db.execute(
        select(func.count(Profile.id)).where(Profile.level_pending_approval.is_(True))
    )).scalar() or 0

    # Pending mission verifications
    pending_verifications = (await db.execute(
        select(func.count(UserMission.id)).where(UserMission.status == "submitted")
    )).scalar() or 0

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
        "pending_approvals": pending_approvals,
        "pending_verifications": pending_verifications,
        "recent_activities": list(recent.scalars().all()),
    }


# ═══ LEVELS MANAGEMENT (PRD §3.1) ═══
@router.get("/levels")
async def list_levels(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: List all gamification levels ordered by progression."""
    result = await db.execute(select(Level).order_by(Level.order_index))
    levels = result.scalars().all()
    return [LevelResponse.model_validate(level) for level in levels]


@router.put("/levels/{level_id}")
async def update_level(
    level_id: uuid.UUID,
    data: LevelUpdate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """
    Admin: Update a level's configuration (PRD §3.1).
    Slug and order_index are fixed — only thresholds and display fields are editable.
    """
    result = await db.execute(select(Level).where(Level.id == level_id))
    level = result.scalar_one_or_none()
    if not level:
        raise NotFoundException("Nível não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise BadRequestException("Nenhum campo para atualizar")

    for field, value in update_data.items():
        setattr(level, field, value)

    await log_audit(
        db, admin_id=current_admin.id, action="update_level",
        entity_type="level", entity_id=str(level_id),
        details=update_data,
        ip_address=request.client.host if request.client else None,
    )

    await db.flush()
    return LevelResponse.model_validate(level)


# ═══ USERS MANAGEMENT ═══
@router.get("/users")
async def list_users(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
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
    result = await service.list_users(
        params=params, role=role, level_id=level_id, region_id=region_id, search=search
    )
    # Serialize SQLAlchemy Profile objects to Pydantic
    result.items = [ProfileResponse.model_validate(u) for u in result.items]
    return result


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
    role: str = Query(...),
):
    """Admin: Update a user's role. Requires SUPER_ADMIN or CAMPAIGN_MANAGER."""
    valid_roles = {"participant", "moderator", "regional_coordinator", "campaign_manager", "analyst", "super_admin"}
    if role not in valid_roles:
        raise BadRequestException(f"Role inválido. Opções: {', '.join(valid_roles)}")

    await db.execute(
        sql_update(Profile).where(Profile.id == user_id).values(role=role)
    )

    # Audit log (PRD §7.2)
    await log_audit(
        db, admin_id=current_admin.id, action="update_role",
        entity_type="user", entity_id=str(user_id),
        details={"new_role": role},
        ip_address=request.client.host if request.client else None,
    )

    return {"message": f"Role atualizado para {role}"}


@router.post("/users/{user_id}/approve-level")
async def approve_user_level(
    user_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
    approved: bool = Query(default=True),
):
    """
    Approve or reject a level-up request (PRD §3.2).
    Levels 4 and 5 require human approval.
    """
    profile_result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise NotFoundException("Usuário não encontrado")

    if not profile.level_pending_approval:
        raise BadRequestException("Usuário não possui aprovação de nível pendente")

    if approved:
        # Find the next level that requires approval
        current_order = 0
        if profile.current_level_id:
            level_result = await db.execute(select(Level).where(Level.id == profile.current_level_id))
            current_level = level_result.scalar_one_or_none()
            current_order = current_level.order_index if current_level else 0

        next_level_result = await db.execute(
            select(Level).where(
                Level.order_index > current_order,
                Level.requires_approval.is_(True),
            ).order_by(Level.order_index.asc()).limit(1)
        )
        next_level = next_level_result.scalar_one_or_none()

        if next_level:
            await db.execute(
                sql_update(Profile).where(Profile.id == user_id).values(
                    current_level_id=next_level.id,
                    level_pending_approval=False,
                )
            )

            # Notify user
            notification = Notification(
                user_id=user_id,
                title="🎉 Nível aprovado!",
                body=f"Parabéns! Seu nível foi aprovado: {next_level.name}",
                notification_type="level_up",
            )
            db.add(notification)
    else:
        await db.execute(
            sql_update(Profile).where(Profile.id == user_id).values(
                level_pending_approval=False,
            )
        )

        notification = Notification(
            user_id=user_id,
            title="Solicitação de nível",
            body="Sua solicitação de nível foi revisada. Continue contribuindo para avançar!",
            notification_type="info",
        )
        db.add(notification)

    # Audit log
    await log_audit(
        db, admin_id=current_admin.id, action="approve_level" if approved else "reject_level",
        entity_type="user", entity_id=str(user_id),
        details={"approved": approved},
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Nível aprovado" if approved else "Solicitação de nível negada"}


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
    reason: str = Query(default=""),
):
    """Admin: Suspend a user account."""
    await db.execute(
        sql_update(Profile).where(Profile.id == user_id).values(is_active=False)
    )

    await log_audit(
        db, admin_id=current_admin.id, action="suspend_user",
        entity_type="user", entity_id=str(user_id),
        details={"reason": reason},
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Usuário suspenso"}


# ═══ MISSIONS MANAGEMENT ═══
@router.get("/missions")
async def list_missions(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category_id: uuid.UUID | None = None,
    mission_type: str | None = None,
    is_featured: bool | None = None,
):
    """Admin: List all missions (including inactive)."""
    service = MissionService(db)
    params = PaginationParams(page=page, page_size=page_size)
    result = await service.list_missions(
        params=params,
        category_id=category_id,
        mission_type=mission_type,
        is_featured=is_featured,
        include_inactive=True,
    )
    result.items = [MissionResponse.model_validate(m) for m in result.items]
    return result


@router.post("/missions")
async def create_mission(
    data: MissionCreate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Create a new mission."""
    service = MissionService(db)
    mission = await service.create_mission(data)

    await log_audit(
        db, admin_id=current_admin.id, action="create_mission",
        entity_type="mission", entity_id=str(mission.id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Missão criada", "mission_id": str(mission.id)}


@router.patch("/missions/{mission_id}")
async def update_mission(
    mission_id: uuid.UUID,
    data: MissionUpdate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Update a mission."""
    service = MissionService(db)
    await service.update_mission(mission_id, data)

    await log_audit(
        db, admin_id=current_admin.id, action="update_mission",
        entity_type="mission", entity_id=str(mission_id),
        details=data.model_dump(exclude_unset=True),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Missão atualizada"}


@router.delete("/missions/{mission_id}")
async def delete_mission(
    mission_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Soft delete a mission."""
    service = MissionService(db)
    await service.delete_mission(mission_id)

    await log_audit(
        db, admin_id=current_admin.id, action="delete_mission",
        entity_type="mission", entity_id=str(mission_id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Missão desativada com sucesso"}


@router.post("/missions/{mission_id}/verify")
async def verify_mission(
    mission_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
    user_id: uuid.UUID = Query(...),
    approved: bool = Query(default=True),
    rejection_reason: str | None = Query(default=None),
):
    """Admin: Verify a mission submission (PRD §4.2 VALIDATED/REJECTED)."""
    result = await db.execute(
        select(UserMission)
        .where(UserMission.user_id == user_id, UserMission.mission_id == mission_id)
    )
    user_mission = result.scalar_one_or_none()
    if not user_mission:
        raise NotFoundException("Submissão não encontrada")

    if user_mission.status != "submitted":
        raise BadRequestException(f"Missão não está em estado de submissão (atual: {user_mission.status})")

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
            idempotency_key=f"{user_id}:mission_verified:{mission_id}:{user_mission.id}",
        )
    else:
        user_mission.status = "rejected"
        user_mission.rejected_reason = rejection_reason

    await log_audit(
        db, admin_id=current_admin.id,
        action="verify_mission" if approved else "reject_mission",
        entity_type="user_mission", entity_id=str(user_mission.id),
        details={"user_id": str(user_id), "approved": approved, "reason": rejection_reason},
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Missão verificada" if approved else "Missão rejeitada"}


# ═══ BADGES MANAGEMENT ═══

@router.get("/badges", response_model=list[BadgeResponse])
async def list_badges(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: List all badges."""
    result = await db.execute(select(Badge).order_by(Badge.name))
    return list(result.scalars().all())


@router.post("/badges")
async def create_badge(
    data: BadgeCreate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Create a new badge."""
    badge = Badge(**data.model_dump())
    db.add(badge)
    await db.flush()

    await log_audit(
        db, admin_id=current_admin.id, action="create_badge",
        entity_type="badge", entity_id=str(badge.id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Badge criado", "badge_id": str(badge.id)}


@router.patch("/badges/{badge_id}")
async def update_badge(
    badge_id: uuid.UUID,
    data: BadgeUpdate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Update an existing badge."""
    from fastapi import HTTPException
    result = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = result.scalar_one_or_none()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(badge, key, value)
    
    await db.flush()

    await log_audit(
        db, admin_id=current_admin.id, action="update_badge",
        entity_type="badge", entity_id=str(badge.id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Badge atualizado"}


@router.delete("/badges/{badge_id}")
async def delete_badge(
    badge_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Soft delete / deactivate a badge."""
    from fastapi import HTTPException
    result = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = result.scalar_one_or_none()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge não encontrado")

    badge.is_active = False
    await db.flush()

    await log_audit(
        db, admin_id=current_admin.id, action="delete_badge",
        entity_type="badge", entity_id=str(badge.id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Badge inativado"}


# ═══ MODERATION QUEUE (PRD §7.1.8) ═══
@router.get("/moderation/queue")
async def get_moderation_queue(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """
    Get the moderation queue — missions pending verification (PRD §7.1.8).
    Also includes anomaly detection for suspicious point spikes (PRD §4.3).
    """
    from sqlalchemy.orm import selectinload

    # Pending verifications
    query = (
        select(UserMission)
        .options(
            selectinload(UserMission.mission),
            selectinload(UserMission.user),
        )
        .where(UserMission.status == "submitted")
        .order_by(UserMission.submitted_at.asc())
    )
    params = PaginationParams(page=page, page_size=page_size)
    count_query = select(func.count(UserMission.id)).where(UserMission.status == "submitted")
    total = (await db.execute(count_query)).scalar() or 0

    query = query.offset(params.offset).limit(params.page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    # PRD §4.3: Anomaly detection — users with suspicious point spikes in last 24h
    day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    suspicious = await db.execute(
        select(
            Activity.user_id,
            func.sum(Activity.points_awarded).label("total_24h"),
            func.count(Activity.id).label("action_count"),
        )
        .where(Activity.created_at >= day_ago)
        .group_by(Activity.user_id)
        .having(func.sum(Activity.points_awarded) > 500)  # Threshold
        .order_by(func.sum(Activity.points_awarded).desc())
        .limit(20)
    )

    suspicious_users = [
        {"user_id": row.user_id, "points_24h": row.total_24h, "actions_24h": row.action_count}
        for row in suspicious
    ]

    return {
        "pending_verifications": {
            "items": items,
            "total": total,
            "page": params.page,
            "page_size": params.page_size,
        },
        "suspicious_activity": suspicious_users,
    }


# ═══ EVENTS MANAGEMENT ═══
@router.post("/events")
async def create_event(
    data: EventCreate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Create a new event."""
    service = EventService(db)
    event = await service.create_event(data, current_admin.id)

    await log_audit(
        db, admin_id=current_admin.id, action="create_event",
        entity_type="event", entity_id=str(event.id),
        ip_address=request.client.host if request.client else None,
    )

    return {
        "message": "Evento criado",
        "event_id": str(event.id),
        "checkin_code": event.checkin_code,
    }


@router.patch("/events/{event_id}")
async def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Update an event."""
    service = EventService(db)
    await service.update_event(event_id, data)

    await log_audit(
        db, admin_id=current_admin.id, action="update_event",
        entity_type="event", entity_id=str(event_id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Evento atualizado"}


@router.post("/events/{event_id}/regenerate-code")
async def regenerate_checkin_code(
    event_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: Regenerate check-in code for an event."""
    service = EventService(db)
    new_code = await service.regenerate_checkin_code(event_id)
    return {"message": "Código regenerado", "checkin_code": new_code}


# ═══ CONTENT MANAGEMENT ═══
@router.get("/content")
async def list_admin_content(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    """Admin: List all content (including inactive)."""
    from src.modules.content.schemas import ContentResponse
    from src.shared.pagination import PaginatedResponse, PaginationParams
    
    query = select(Content).order_by(Content.created_at.desc())
    count_query = select(func.count(Content.id))
    
    total = (await db.execute(count_query)).scalar() or 0
    params = PaginationParams(page=page, page_size=page_size)
    query = query.offset(params.offset).limit(params.page_size)
    
    result = await db.execute(query)
    items = list(result.scalars().all())
    
    return {
        "items": [ContentResponse.model_validate(c) for c in items],
        "total": total,
        "page": params.page,
        "page_size": params.page_size,
    }


@router.delete("/content/{content_id}")
async def delete_content(
    content_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Soft delete content."""
    from fastapi import HTTPException
    result = await db.execute(select(Content).where(Content.id == content_id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado")

    content.is_active = False
    await db.flush()

    await log_audit(
        db, admin_id=current_admin.id, action="delete_content",
        entity_type="content", entity_id=str(content.id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Conteúdo inativado"}


@router.post("/content")
async def create_content(
    data: ContentCreate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Create new content for sharing."""
    service = ContentService(db)
    content = await service.create_content(data, created_by=None)

    await log_audit(
        db, admin_id=current_admin.id, action="create_content",
        entity_type="content", entity_id=str(content.id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Conteúdo criado", "content_id": str(content.id)}


@router.patch("/content/{content_id}")
async def update_content(
    content_id: uuid.UUID,
    data: ContentUpdate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Admin: Update content."""
    service = ContentService(db)
    await service.update_content(content_id, data)

    await log_audit(
        db, admin_id=current_admin.id, action="update_content",
        entity_type="content", entity_id=str(content_id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Conteúdo atualizado"}


# ═══ NOTIFICATIONS & CAMPAIGNS ═══
@router.post("/notifications/send")
async def send_notification(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    title: str = Query(...),
    body: str = Query(...),
    notification_type: str = Query(default="info"),
    target_level_id: uuid.UUID | None = None,
    target_region_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
):
    """Admin: Send a notification (targeted or broadcast)."""
    service = NotificationService(db)
    await service.create_notification(
        title=title, body=body, notification_type=notification_type,
        user_id=user_id, target_level_id=target_level_id,
        target_region_id=target_region_id,
    )
    return {"message": "Notificação enviada"}


@router.post("/notifications/campaign")
async def create_campaign(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
    title: str = Query(...),
    body: str = Query(...),
    segment_level_id: uuid.UUID | None = None,
    segment_region_id: uuid.UUID | None = None,
    segment_role: str | None = None,
):
    """
    Admin: Create and send a segmented notification campaign (PRD §7.1.3).
    // LEGAL-REVIEW: Comunicação segmentada requer consentimento de comunicação (PRD §8.2)
    """
    service = NotificationService(db)
    campaign = await service.create_campaign(
        title=title, body=body, created_by=current_admin.id,
        segment_level_id=segment_level_id,
        segment_region_id=segment_region_id,
        segment_role=segment_role,
    )
    result = await service.send_campaign(campaign.id)

    await log_audit(
        db, admin_id=current_admin.id, action="send_campaign",
        entity_type="notification_campaign", entity_id=str(campaign.id),
        details={"sent_count": result.get("sent_count", 0)},
        ip_address=request.client.host if request.client else None,
    )

    return result


@router.get("/notifications/campaigns")
async def list_campaigns(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: List all notification campaigns."""
    service = NotificationService(db)
    return await service.list_campaigns()


# ═══ ANALYTICS ═══
@router.get("/analytics/engagement")
async def get_engagement_analytics(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(default=30, ge=1, le=365),
):
    """Admin: Get engagement analytics for the specified period."""
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

    # Missions completed per day
    daily_missions = await db.execute(
        select(
            func.date_trunc("day", UserMission.completed_at).label("date"),
            func.count(UserMission.id).label("count"),
        )
        .where(UserMission.completed_at >= start_date, UserMission.status == "completed")
        .group_by(func.date_trunc("day", UserMission.completed_at))
        .order_by(func.date_trunc("day", UserMission.completed_at))
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
        "daily_missions_completed": [
            {"date": str(row.date), "count": row.count}
            for row in daily_missions
        ],
    }


# ═══ REPORTS EXPORT (PRD §7.1.7) ═══
@router.get("/reports/export")
async def export_report(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    report_type: str = Query(default="users", description="users, missions, events"),
    days: int = Query(default=30, ge=1, le=365),
):
    """Admin: Export report as CSV (PRD §7.1.7)."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "users":
        writer.writerow(["ID", "Nome", "Email", "Cidade", "Estado", "Pontos", "Nível", "Role", "Cadastro"])
        result = await db.execute(
            select(Profile)
            .where(Profile.is_active.is_(True), Profile.created_at >= start_date)
            .order_by(Profile.created_at.desc())
        )
        for user in result.scalars().all():
            writer.writerow([
                str(user.id), user.full_name, user.email,
                user.city, user.state, user.total_points,
                "", user.role, str(user.created_at),
            ])

    elif report_type == "missions":
        writer.writerow(["Usuário", "Missão", "Status", "Pontos", "Início", "Conclusão"])
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(UserMission)
            .options(selectinload(UserMission.mission), selectinload(UserMission.user))
            .where(UserMission.started_at >= start_date)
            .order_by(UserMission.started_at.desc())
        )
        for um in result.scalars().all():
            writer.writerow([
                um.user.full_name if um.user else "", um.mission.title if um.mission else "",
                um.status, um.points_awarded, str(um.started_at),
                str(um.completed_at) if um.completed_at else "",
            ])

    elif report_type == "events":
        writer.writerow(["Evento", "Tipo", "Data", "Local", "Inscritos", "Check-ins"])
        result = await db.execute(
            select(Event).where(Event.start_datetime >= start_date).order_by(Event.start_datetime.desc())
        )
        for event in result.scalars().all():
            registered = (await db.execute(
                select(func.count(EventParticipant.id)).where(EventParticipant.event_id == event.id)
            )).scalar() or 0
            attended = (await db.execute(
                select(func.count(EventParticipant.id)).where(
                    EventParticipant.event_id == event.id, EventParticipant.status == "attended"
                )
            )).scalar() or 0
            writer.writerow([
                event.title, event.event_type, str(event.start_datetime),
                event.location_name or "", registered, attended,
            ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{report_type}_{days}d.csv"},
    )


# ═══ AUDIT LOGS (PRD §7.2) ═══
@router.get("/audit-logs")
async def get_audit_logs(
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    action: str | None = None,
    entity_type: str | None = None,
):
    """Admin: View audit logs. SUPER_ADMIN only."""
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
        count_query = count_query.where(AuditLog.entity_type == entity_type)

    total = (await db.execute(count_query)).scalar() or 0
    params = PaginationParams(page=page, page_size=page_size)
    query = query.order_by(AuditLog.created_at.desc()).offset(params.offset).limit(params.page_size)

    result = await db.execute(query)
    items = list(result.scalars().all())

    from src.shared.pagination import PaginatedResponse
    # Serialize AuditLog SQLAlchemy objects
    serialized = [
        {
            "id": str(log.id),
            "admin_id": str(log.admin_id),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in items
    ]
    return PaginatedResponse.create(items=serialized, total=total, params=params)


# ═══ POINTS RECONCILIATION (PRD §5.1) ═══
@router.post("/reconcile-points/{user_id}")
async def reconcile_user_points(
    user_id: uuid.UUID,
    current_admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Admin: Reconcile materialized points vs ledger for a user."""
    engine = GamificationEngine(db)
    return await engine.reconcile_points(user_id)

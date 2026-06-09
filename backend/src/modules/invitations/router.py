"""
═══════════════════════════════════════════════════════════════
  Invitations Module — Router
  PRD §6.1.8: Convidar — link/deep-link rastreável + acompanhamento
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.invitations.schemas import InviteCreate, InviteResponse, InviteTrackingResponse
from src.modules.invitations.service import InvitationService
from src.modules.users.models import Profile

router = APIRouter()


@router.post("", response_model=InviteResponse)
async def create_invitation(
    data: InviteCreate,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a trackable invitation.
    Anti self-invite and duplicate checks are enforced.
    """
    service = InvitationService(db)
    return await service.create_invitation(current_user.id, data)


@router.get("/my", response_model=InviteTrackingResponse)
async def get_my_invitations(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all invitations sent by the current user with tracking stats."""
    service = InvitationService(db)
    return await service.get_user_invitations(current_user.id)


@router.post("/{invite_code}/validate")
async def validate_invitation(
    invite_code: str,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Validate an invitation (called after invitee verifies account).
    Points are awarded to the inviter only at this step.
    """
    service = InvitationService(db)
    return await service.validate_invitation(invite_code, current_user.id)


@router.post("/share", response_model=InviteResponse)
async def record_share(
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Record a share action — creates a pending invitation entry.
    Called when the user taps "Share" on the Invitations screen.
    """
    service = InvitationService(db)
    return await service.record_share(current_user.id, current_user.referral_code)

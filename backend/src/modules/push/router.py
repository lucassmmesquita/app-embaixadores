"""
═══════════════════════════════════════════════════════════════
  Push Module — Router
  Endpoints para registro/desregistro de device tokens.
═══════════════════════════════════════════════════════════════
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import get_current_user
from src.modules.push.schemas import RegisterTokenRequest, UnregisterTokenRequest
from src.modules.push.service import PushService
from src.modules.users.models import Profile

router = APIRouter()


@router.post("/device-tokens")
async def register_device_token(
    data: RegisterTokenRequest,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Registrar device token para push notifications."""
    service = PushService(db)
    await service.register_token(current_user.id, data.token, data.platform)
    return {"message": "Token registrado com sucesso"}


@router.delete("/device-tokens")
async def unregister_device_token(
    data: UnregisterTokenRequest,
    current_user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Remover device token (logout)."""
    service = PushService(db)
    await service.unregister_token(data.token)
    return {"message": "Token removido com sucesso"}

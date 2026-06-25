"""
═══════════════════════════════════════════════════════════════
  Push Module — Service (Orchestrator)
  NÃO conhece Expo nem Firebase. Delega para providers via interface.
  Para trocar de engine: criar novo provider e registrar em get_providers().
═══════════════════════════════════════════════════════════════
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.push.models import DeviceToken
from src.modules.push.providers.base import PushProvider

logger = logging.getLogger(__name__)


def get_providers() -> list[PushProvider]:
    """
    Factory: retorna os providers ativos.
    ╔════════════════════════════════════════════════════════╗
    ║  Para trocar de engine, modifique APENAS esta função  ║
    ╚════════════════════════════════════════════════════════╝
    """
    from src.modules.push.providers.expo import ExpoPushProvider
    from src.modules.push.providers.firebase import FirebasePushProvider

    return [ExpoPushProvider(), FirebasePushProvider()]


class PushService:
    """Orquestrador de push notifications — agnóstico de provider."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.providers = get_providers()

    # ─── Token Management ───

    async def register_token(
        self, user_id: uuid.UUID, token: str, platform: str
    ) -> DeviceToken:
        """Registra ou atualiza um device token (upsert)."""
        result = await self.db.execute(
            select(DeviceToken).where(DeviceToken.token == token)
        )
        device = result.scalar_one_or_none()

        if device:
            device.user_id = user_id
            device.platform = platform
            device.is_active = True
            device.updated_at = datetime.now(timezone.utc)
        else:
            device = DeviceToken(
                user_id=user_id,
                token=token,
                platform=platform,
            )
            self.db.add(device)

        await self.db.flush()
        logger.info("Device token registered: platform=%s user=%s", platform, user_id)
        return device

    async def unregister_token(self, token: str) -> None:
        """Desativa um device token (logout)."""
        await self.db.execute(
            update(DeviceToken)
            .where(DeviceToken.token == token)
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )
        logger.info("Device token unregistered: %s...", token[:20])

    # ─── Push Sending (agnóstico de provider) ───

    async def send_to_user(
        self,
        user_id: uuid.UUID,
        title: str,
        body: str,
        data: dict | None = None,
    ) -> None:
        """Envia push para todos os devices de um usuário."""
        tokens = await self._get_active_tokens(user_ids=[user_id])
        await self._dispatch(tokens, title, body, data)

    async def send_to_users(
        self,
        user_ids: list[uuid.UUID],
        title: str,
        body: str,
        data: dict | None = None,
    ) -> None:
        """Envia push para múltiplos usuários (broadcast)."""
        if not user_ids:
            return
        tokens = await self._get_active_tokens(user_ids=user_ids)
        await self._dispatch(tokens, title, body, data)

    # ─── Internal ───

    async def _get_active_tokens(
        self, user_ids: list[uuid.UUID]
    ) -> list[DeviceToken]:
        result = await self.db.execute(
            select(DeviceToken).where(
                DeviceToken.user_id.in_(user_ids),
                DeviceToken.is_active.is_(True),
            )
        )
        return list(result.scalars().all())

    async def _dispatch(
        self,
        tokens: list[DeviceToken],
        title: str,
        body: str,
        data: dict | None,
    ) -> None:
        """Roteia tokens para o provider correto baseado na plataforma."""
        if not tokens:
            logger.debug("No active device tokens — skipping push")
            return

        for provider in self.providers:
            supported = provider.supported_platforms()
            provider_tokens = [t for t in tokens if t.platform in supported]

            if not provider_tokens:
                continue

            token_strings = [t.token for t in provider_tokens]
            result = await provider.send_batch(token_strings, title, body, data)

            logger.info(
                "%s: %d sent, %d failed (platforms: %s)",
                provider.__class__.__name__,
                result.success_count,
                result.failure_count,
                supported,
            )

            # Desativar tokens inválidos
            if result.invalid_tokens:
                await self.db.execute(
                    update(DeviceToken)
                    .where(DeviceToken.token.in_(result.invalid_tokens))
                    .values(is_active=False, updated_at=datetime.now(timezone.utc))
                )
                logger.info(
                    "Deactivated %d invalid tokens", len(result.invalid_tokens)
                )

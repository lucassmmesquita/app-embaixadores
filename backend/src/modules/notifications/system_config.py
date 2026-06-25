"""
═══════════════════════════════════════════════════════════════
  System Notification Config — Model + Service
  Templates configuráveis para notificações automáticas (missão,
  level up, badge, evento, convite) com toggle ativar/desativar.
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, Text, select, update
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class SystemNotificationConfig(Base):
    """Configurable system notification template with on/off toggle."""
    __tablename__ = "system_notification_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    title_template: Mapped[str] = mapped_column(String(300), nullable=False)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SystemNotificationService:
    """Service to manage and dispatch system notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_configs(self) -> list[SystemNotificationConfig]:
        """List all system notification configs."""
        result = await self.db.execute(
            select(SystemNotificationConfig).order_by(SystemNotificationConfig.event_key)
        )
        return list(result.scalars().all())

    async def get_config(self, event_key: str) -> SystemNotificationConfig | None:
        """Get a specific config by event_key."""
        result = await self.db.execute(
            select(SystemNotificationConfig).where(
                SystemNotificationConfig.event_key == event_key
            )
        )
        return result.scalar_one_or_none()

    async def toggle_config(self, event_key: str, is_active: bool) -> SystemNotificationConfig | None:
        """Toggle a system notification config on/off."""
        config = await self.get_config(event_key)
        if not config:
            return None
        config.is_active = is_active
        config.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return config

    async def send_system_notification(
        self,
        event_key: str,
        user_id: uuid.UUID,
        context: dict | None = None,
    ) -> bool:
        """
        Create an in-app notification using the template if the config is active.
        `context` is a dict of variables for template interpolation.
        Returns True if notification was created, False if skipped.
        """
        config = await self.get_config(event_key)
        if not config or not config.is_active:
            return False

        ctx = context or {}

        # Interpolate templates with context variables
        try:
            title = config.title_template.format(**ctx)
        except (KeyError, IndexError):
            title = config.title_template

        try:
            body = config.body_template.format(**ctx)
        except (KeyError, IndexError):
            body = config.body_template

        # Create the notification
        from src.modules.notifications.models import Notification
        notification = Notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type=config.notification_type,
        )
        self.db.add(notification)
        await self.db.flush()
        return True

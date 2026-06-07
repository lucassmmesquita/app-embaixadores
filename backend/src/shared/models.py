"""
═══════════════════════════════════════════════════════════════
  Shared Models — Base mixins and common patterns
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class TimestampMixin:
    """Adds created_at and updated_at columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SoftDeleteMixin:
    """Adds is_active column for soft deletes."""

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")


class UUIDMixin:
    """Adds UUID primary key."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

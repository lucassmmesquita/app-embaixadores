"""
═══════════════════════════════════════════════════════════════
  Invitations Module — Models
  PRD §4.1 INVITE: Rastreável invite system
  PRD §4.3: Anti self-invite + convite só pontua quando convidado verifica
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class Invitation(Base):
    """
    Trackable invitation record.
    Points are awarded ONLY when the invitee verifies their account (PRD §4.3).
    """
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inviter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    invitee_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    invitee_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    invitee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True
    )
    invite_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    # Status: pending → registered → verified
    status: Mapped[str] = mapped_column(String(20), default="pending")
    points_awarded: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    registered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        # Index for faster lookups
        # Note: unique constraints removed — shares create multiple pending invitations
    )

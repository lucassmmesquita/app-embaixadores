"""
═══════════════════════════════════════════════════════════════
  Gamification Module — Models
  Activity log, badges, and user badges.
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.shared.models import TimestampMixin


class Activity(Base, TimestampMixin):
    __tablename__ = "activities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    action_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    extra_data: Mapped[dict] = mapped_column("metadata", JSONB, default={})

    # Relationships
    user: Mapped["Profile"] = relationship("Profile", back_populates="activities")


class Badge(Base, TimestampMixin):
    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(20), default="achievement")
    rarity: Mapped[str] = mapped_column(String(20), default="common")
    criteria_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    criteria_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    user_badges: Mapped[list["UserBadge"]] = relationship("UserBadge", back_populates="badge")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    badge_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("badges.id", ondelete="CASCADE"))
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now())
    seen: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    user: Mapped["Profile"] = relationship("Profile", back_populates="user_badges")
    badge: Mapped[Badge] = relationship("Badge", back_populates="user_badges")

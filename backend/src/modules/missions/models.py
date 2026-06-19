"""
═══════════════════════════════════════════════════════════════
  Missions Module — Models
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.shared.models import SoftDeleteMixin, TimestampMixin


class MissionCategory(Base, TimestampMixin):
    __tablename__ = "mission_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    missions: Mapped[list["Mission"]] = relationship("Mission", back_populates="category")


class Mission(Base, TimestampMixin, SoftDeleteMixin):
    """
    Mission template (PRD §4.1).
    action_type values: EVENT_ATTENDANCE, CONTENT_SHARE, INVITE
    recurrence values: ONE_TIME, DAILY, WEEKLY, PER_EVENT (PRD §4.4)
    """
    __tablename__ = "missions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mission_categories.id"), nullable=True
    )
    # PRD §4.4: Recurrence type
    recurrence: Mapped[str] = mapped_column(String(20), default="ONE_TIME")
    # PRD §4.1: Action/mission type
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # PRD §4.1: Points are configurable per mission (never hardcode)
    points_reward: Mapped[int] = mapped_column(Integer, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=0)
    required_count: Mapped[int] = mapped_column(Integer, default=1)
    min_level_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("levels.id"), nullable=True
    )
    badge_reward_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("badges.id"), nullable=True
    )
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_participants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requires_verification: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_data: Mapped[dict] = mapped_column("metadata", JSONB, default={})

    # PRD §4.3: Rate limiting per mission type
    max_daily_completions: Mapped[int] = mapped_column(Integer, default=0)
    # 0 = unlimited

    # PRD §4.2: Max re-submissions on rejection
    max_submissions: Mapped[int] = mapped_column(Integer, default=3)

    # PRD §4.1: Self-declared low-weight missions go directly to COMPLETED
    is_self_declared: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    category: Mapped[MissionCategory | None] = relationship("MissionCategory", back_populates="missions")
    user_missions: Mapped[list["UserMission"]] = relationship("UserMission", back_populates="mission")


class UserMission(Base):
    """
    User's mission progress.
    PRD §4.2 States: AVAILABLE → IN_PROGRESS → SUBMITTED → (VALIDATED | REJECTED) → COMPLETED
    """
    __tablename__ = "user_missions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    mission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("missions.id", ondelete="CASCADE"))
    progress_count: Mapped[int] = mapped_column(Integer, default=0)
    # PRD §4.2: Full state machine
    status: Mapped[str] = mapped_column(String(30), default="in_progress")
    evidence_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    submission_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)
    rejected_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    user: Mapped["Profile"] = relationship("Profile", back_populates="user_missions", foreign_keys=[user_id])
    mission: Mapped[Mission] = relationship("Mission", back_populates="user_missions")

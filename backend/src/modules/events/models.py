"""
═══════════════════════════════════════════════════════════════
  Events Module — Models
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.shared.models import SoftDeleteMixin, TimestampMixin


class Event(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type: Mapped[str] = mapped_column(String(20), default="meeting")
    location_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(200), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    online_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_datetime: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_level_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("levels.id"), nullable=True
    )
    points_reward: Mapped[int] = mapped_column(Integer, default=0)
    cover_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True
    )
    region_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id"), nullable=True
    )
    extra_data: Mapped[dict] = mapped_column("metadata", JSONB, default={})

    # Relationships
    participants: Mapped[list["EventParticipant"]] = relationship("EventParticipant", back_populates="event")


class EventParticipant(Base):
    __tablename__ = "event_participants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="registered")
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now()
    )

    # Relationships
    event: Mapped[Event] = relationship("Event", back_populates="participants")

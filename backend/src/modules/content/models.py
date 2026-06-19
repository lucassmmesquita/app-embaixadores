"""
═══════════════════════════════════════════════════════════════
  Content Module — Models
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.shared.models import SoftDeleteMixin, TimestampMixin


class Content(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "content"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    share_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    points_per_share: Mapped[int] = mapped_column(Integer, default=5)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    total_shares: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True
    )


class ContentShare(Base):
    __tablename__ = "content_shares"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    platform: Mapped[str | None] = mapped_column(String(20), nullable=True)
    shared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now())


class MaterialClick(Base):
    """
    Tracks unique clicks on shared material landing pages.
    Anti-fraud: one reward per visitor_hash per content per referrer.
    """
    __tablename__ = "material_clicks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"))
    referrer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    visitor_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    points_awarded: Mapped[bool] = mapped_column(Boolean, default=False)
    clicked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now())

"""
═══════════════════════════════════════════════════════════════
  Admin Auth — SQLAlchemy Models
  Independent admin user management with granular permissions.
  Auth via JWT with email/password stored in Postgres.
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.shared.models import TimestampMixin


class AdminUser(Base, TimestampMixin):
    """
    Admin user with independent auth (not Supabase).
    Stores email + bcrypt password hash for JWT-based login.
    """

    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    full_name: Mapped[str] = mapped_column(String(300), nullable=False)
    role: Mapped[str] = mapped_column(
        String(30), default="campaign_manager", nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Refresh token tracking (for logout / token invalidation)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Relationships
    permissions: Mapped[list["AdminPermission"]] = relationship(
        "AdminPermission", back_populates="admin_user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<AdminUser {self.email} role={self.role}>"


class AdminPermission(Base):
    """
    Granular permission grants for admin users.
    Each row grants a specific action on a specific resource.
    SUPER_ADMIN bypasses all checks (wildcard).
    """

    __tablename__ = "admin_permissions"
    __table_args__ = (
        UniqueConstraint("admin_user_id", "resource", "action", name="uq_admin_permission"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    granted: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    # Relationships
    admin_user: Mapped[AdminUser] = relationship("AdminUser", back_populates="permissions")

    def __repr__(self) -> str:
        return f"<AdminPermission {self.resource}.{self.action} granted={self.granted}>"


# ═══════════════════════════════════════════════════════════════
#  Permission constants — all available resources and actions
# ═══════════════════════════════════════════════════════════════

RESOURCES_ACTIONS: dict[str, list[str]] = {
    "dashboard": ["view"],
    "users": ["list", "read", "update_role", "approve_level", "suspend", "export"],
    "missions": ["list", "create", "update", "delete", "verify"],
    "events": ["list", "create", "update", "delete", "regenerate_code"],
    "content": ["list", "create", "update", "delete"],
    "notifications": ["list", "send", "create_campaign"],
    "moderation": ["view_queue", "approve", "reject"],
    "analytics": ["view", "export"],
    "audit": ["view"],
    "admin_users": ["list", "create", "update", "delete", "manage_permissions"],
}

# Default permission sets per role
DEFAULT_PERMISSIONS: dict[str, dict[str, list[str]]] = {
    "super_admin": {},  # Bypasses all checks — no explicit grants needed
    "campaign_manager": {
        "dashboard": ["view"],
        "users": ["list", "read", "update_role", "approve_level", "suspend", "export"],
        "missions": ["list", "create", "update", "delete", "verify"],
        "events": ["list", "create", "update", "delete", "regenerate_code"],
        "content": ["list", "create", "update", "delete"],
        "notifications": ["list", "send", "create_campaign"],
        "moderation": ["view_queue", "approve", "reject"],
        "analytics": ["view", "export"],
    },
    "regional_coordinator": {
        "dashboard": ["view"],
        "users": ["list", "read"],
        "missions": ["list"],
        "events": ["list", "create", "update"],
        "content": ["list"],
        "notifications": ["list", "send"],
        "analytics": ["view"],
    },
    "moderator": {
        "dashboard": ["view"],
        "moderation": ["view_queue", "approve", "reject"],
        "missions": ["list", "verify"],
        "users": ["list", "read"],
    },
    "analyst": {
        "dashboard": ["view"],
        "users": ["list", "read"],
        "missions": ["list"],
        "events": ["list"],
        "analytics": ["view", "export"],
    },
}

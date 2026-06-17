"""
═══════════════════════════════════════════════════════════════
  Admin Auth — Pydantic Schemas
  Request/response models for admin authentication and user management.
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ═══ AUTH ═══

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class AdminTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class AdminRefreshRequest(BaseModel):
    refresh_token: str


# ═══ ADMIN USER CRUD ═══

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=300)
    role: str = Field(default="campaign_manager")


class AdminUserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=2, max_length=300)
    role: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None = None
    avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime
    permissions: list["PermissionResponse"] = []

    model_config = {"from_attributes": True}


class AdminMeResponse(BaseModel):
    """Response for /me endpoint — includes computed permissions list."""
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    avatar_url: str | None = None
    permissions: list["PermissionResponse"] = []
    is_super_admin: bool = False

    model_config = {"from_attributes": True}


# ═══ PERMISSIONS ═══

class PermissionGrant(BaseModel):
    resource: str
    action: str
    granted: bool = True


class PermissionResponse(BaseModel):
    id: uuid.UUID
    resource: str
    action: str
    granted: bool

    model_config = {"from_attributes": True}


class PermissionBulkUpdate(BaseModel):
    """Bulk update permissions for an admin user."""
    permissions: list[PermissionGrant]


class AvailablePermissionsResponse(BaseModel):
    """All available resources and their actions."""
    resources: dict[str, list[str]]

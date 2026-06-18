"""
═══════════════════════════════════════════════════════════════
  Users Module — Pydantic Schemas (DTOs)
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


# ═══ LEVEL ═══
class LevelResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    order_index: int
    min_points: int
    max_points: int | None = None
    icon_url: str | None = None
    color: str | None = None
    min_missions_completed: int = 0
    min_referrals_active: int = 0
    requires_approval: bool = False

    model_config = {"from_attributes": True}


class LevelUpdate(BaseModel):
    """Admin-editable fields for a level. Slug/order_index are fixed."""
    name: str | None = None
    description: str | None = None
    min_points: int | None = Field(None, ge=0)
    max_points: int | None = None
    icon_url: str | None = None
    color: str | None = Field(None, max_length=7)
    min_missions_completed: int | None = Field(None, ge=0)
    min_referrals_active: int | None = Field(None, ge=0)
    requires_approval: bool | None = None


# ═══ REGION ═══
class RegionResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    city: str | None = None
    state: str | None = None

    model_config = {"from_attributes": True}


# ═══ CONSENT (LGPD §8.1) ═══
class ConsentCreate(BaseModel):
    """Register a granular LGPD consent."""
    consent_type: str = Field(
        ...,
        description="Type: data_processing, communication, public_ranking",
    )
    granted: bool = True
    version: str = "1.0"


class ConsentResponse(BaseModel):
    id: uuid.UUID
    consent_type: str
    version: str
    granted: bool
    granted_at: datetime
    revoked_at: datetime | None = None

    model_config = {"from_attributes": True}


# ═══ PROFILE ═══
class ProfileBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=300)
    phone: str | None = None
    bio: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None


class ProfileCreate(ProfileBase):
    email: EmailStr
    password: str = Field(..., min_length=6)
    referral_code: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=300)
    phone: str | None = None
    bio: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    avatar_url: str | None = None
    region_id: uuid.UUID | None = None


class ProfileResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    region_id: uuid.UUID | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    total_points: int = 0
    current_level: LevelResponse | None = None
    role: str = "participant"
    referral_code: str | None = None
    onboarding_completed: bool = False
    level_pending_approval: bool = False
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class ProfilePublic(BaseModel):
    """Public-facing profile (limited data for rankings, etc.)"""
    id: uuid.UUID
    full_name: str
    avatar_url: str | None = None
    total_points: int = 0
    current_level: LevelResponse | None = None
    city: str | None = None
    state: str | None = None

    model_config = {"from_attributes": True}


class DeleteAccountRequest(BaseModel):
    """
    PRD §8.1 LGPD: Direito do titular à exclusão.
    Fluxo de 'apagar minha conta' com anonimização do histórico.
    """
    confirmation: str = Field(
        ...,
        description="User must type 'EXCLUIR MINHA CONTA' to confirm",
    )
    reason: str | None = None

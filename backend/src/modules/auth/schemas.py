"""
═══════════════════════════════════════════════════════════════
  Auth Module — Schemas
═══════════════════════════════════════════════════════════════
"""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=300)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str | None = None
    city: str | None = None
    state: str | None = None
    referral_code: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


class SocialLoginRequest(BaseModel):
    provider: str = Field(..., description="Provider: google, facebook, apple")
    access_token: str

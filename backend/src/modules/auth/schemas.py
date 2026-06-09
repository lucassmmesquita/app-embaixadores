"""
═══════════════════════════════════════════════════════════════
  Auth Module — Schemas
═══════════════════════════════════════════════════════════════
"""

from pydantic import BaseModel, EmailStr, Field


class ConsentInput(BaseModel):
    """Granular consent provided during registration (LGPD §8.1)."""
    consent_type: str = Field(
        ...,
        description="Type: data_processing, communication, public_ranking",
    )
    granted: bool = True
    version: str = "1.0"


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
    # PRD §8.1: Consentimento granular no cadastro
    consents: list[ConsentInput] = Field(
        default_factory=list,
        description="Granular LGPD consents: data_processing (required), communication, public_ranking",
    )


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


class SocialLoginRequest(BaseModel):
    """Social login via Google or Apple ID token."""
    provider: str = Field(..., description="Provider: google or apple")
    id_token: str = Field(..., description="ID token obtained from the provider SDK")
    referral_code: str | None = Field(None, description="Optional referral code from invitation link")


class SocialSessionRequest(BaseModel):
    """Social login when Supabase already handled OAuth (e.g. Expo Go WebBrowser flow)."""
    access_token: str = Field(..., description="Supabase access token from OAuth flow")
    refresh_token: str = Field(..., description="Supabase refresh token from OAuth flow")
    referral_code: str | None = Field(None, description="Optional referral code from invitation link")


class ForgotPasswordRequest(BaseModel):
    """Request password reset email."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password with token from email."""
    access_token: str = Field(..., description="Access token from the password reset email link")
    new_password: str = Field(..., min_length=6)

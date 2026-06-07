"""
═══════════════════════════════════════════════════════════════
  Security — JWT Verification & Auth Dependencies
  Verifies Supabase-issued JWTs and provides current user.
═══════════════════════════════════════════════════════════════
"""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.modules.users.models import Profile

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Profile:
    """
    FastAPI dependency that extracts and verifies the JWT from the
    Authorization header, then returns the corresponding user profile.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        # Use Supabase JWT secret to verify tokens issued by Supabase Auth.
        # Falls back to api_secret_key for locally-issued tokens.
        jwt_secret = settings.supabase_jwt_secret or settings.api_secret_key

        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_aud": False},
        )

        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: user ID ausente",
            )

        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(tz=timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expirado",
            )

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {e!s}",
        ) from e

    # Fetch user profile from database
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de usuário não encontrado",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada",
        )

    return user


async def get_current_admin(
    current_user: Annotated[Profile, Depends(get_current_user)],
) -> Profile:
    """Dependency that ensures the current user has admin privileges."""
    admin_roles = {"admin", "super_admin", "coordinator"}
    if current_user.role not in admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )
    return current_user


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Profile | None:
    """Optional auth — returns None if no token is provided."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None

"""
═══════════════════════════════════════════════════════════════
  Admin Auth — FastAPI Dependencies
  Authentication and permission-checking dependencies for admin endpoints.
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.modules.admin_auth.models import AdminPermission, AdminUser
from src.modules.admin_auth.service import verify_admin_token

security_scheme = HTTPBearer(auto_error=False)


async def get_current_admin_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUser:
    """
    FastAPI dependency that extracts and verifies the admin JWT from
    the Authorization header, then returns the corresponding AdminUser.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_admin_token(token)

    admin_id = payload.get("sub")
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: admin ID ausente",
        )

    result = await db.execute(
        select(AdminUser)
        .options(selectinload(AdminUser.permissions))
        .where(AdminUser.id == admin_id)
    )
    admin = result.scalar_one_or_none()

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin não encontrado",
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada",
        )

    return admin


def require_permission(resource: str, action: str):
    """
    Factory dependency for granular permission checking.
    SUPER_ADMIN bypasses all checks.

    Usage:
        @router.get("/users")
        async def list_users(
            admin: Annotated[AdminUser, Depends(require_permission("users", "list"))],
        ):
    """

    async def permission_checker(
        admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    ) -> AdminUser:
        # Super admin has all permissions
        if admin.role == "super_admin":
            return admin

        # Check if the admin has the specific permission
        has_perm = any(
            p.resource == resource and p.action == action and p.granted
            for p in admin.permissions
        )

        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão negada: {resource}.{action}",
            )

        return admin

    return permission_checker


def require_super_admin():
    """Dependency that requires SUPER_ADMIN role."""

    async def checker(
        admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    ) -> AdminUser:
        if admin.role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito a Super Admin",
            )
        return admin

    return checker

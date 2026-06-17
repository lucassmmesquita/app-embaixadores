"""
═══════════════════════════════════════════════════════════════
  Admin Auth — Router
  Authentication endpoints for the admin panel.
  Login, refresh, logout, and admin user management (CRUD).
═══════════════════════════════════════════════════════════════
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.admin_auth.dependencies import (
    get_current_admin_user,
    require_permission,
    require_super_admin,
)
from src.modules.admin_auth.models import AdminUser, RESOURCES_ACTIONS
from src.modules.admin_auth.schemas import (
    AdminLoginRequest,
    AdminMeResponse,
    AdminRefreshRequest,
    AdminTokenResponse,
    AdminUserCreate,
    AdminUserResponse,
    AdminUserUpdate,
    AvailablePermissionsResponse,
    PermissionBulkUpdate,
    PermissionResponse,
)
from src.modules.admin_auth.service import AdminAuthService
from src.shared.audit import log_audit

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
#  Authentication
# ═══════════════════════════════════════════════════════════════


@router.post("/login", response_model=AdminTokenResponse)
async def admin_login(
    data: AdminLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate admin user with email + password → JWT tokens."""
    service = AdminAuthService(db)
    return await service.login(data)


@router.post("/refresh", response_model=AdminTokenResponse)
async def admin_refresh(
    data: AdminRefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Refresh an expired access token using the refresh token."""
    service = AdminAuthService(db)
    return await service.refresh(data.refresh_token)


@router.post("/logout")
async def admin_logout(
    admin: Annotated[AdminUser, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Logout — invalidate refresh token."""
    service = AdminAuthService(db)
    await service.logout(admin.id)
    return {"message": "Logout realizado com sucesso"}


@router.get("/me", response_model=AdminMeResponse)
async def admin_me(
    admin: Annotated[AdminUser, Depends(get_current_admin_user)],
):
    """Get current admin user profile and permissions."""
    permissions = [
        PermissionResponse(
            id=p.id,
            resource=p.resource,
            action=p.action,
            granted=p.granted,
        )
        for p in admin.permissions
    ]

    return AdminMeResponse(
        id=admin.id,
        email=admin.email,
        full_name=admin.full_name,
        role=admin.role,
        avatar_url=admin.avatar_url,
        permissions=permissions,
        is_super_admin=admin.role == "super_admin",
    )


# ═══════════════════════════════════════════════════════════════
#  Admin User Management (requires admin_users permissions)
# ═══════════════════════════════════════════════════════════════


@router.get("/users", response_model=list[AdminUserResponse])
async def list_admin_users(
    admin: Annotated[AdminUser, Depends(require_permission("admin_users", "list"))],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all admin users. Requires admin_users.list permission."""
    service = AdminAuthService(db)
    admins = await service.list_admins()
    return [
        AdminUserResponse(
            id=a.id,
            email=a.email,
            full_name=a.full_name,
            role=a.role,
            is_active=a.is_active,
            last_login_at=a.last_login_at,
            avatar_url=a.avatar_url,
            created_at=a.created_at,
            updated_at=a.updated_at,
            permissions=[
                PermissionResponse(
                    id=p.id, resource=p.resource, action=p.action, granted=p.granted
                )
                for p in a.permissions
            ],
        )
        for a in admins
    ]


@router.post("/users", response_model=AdminUserResponse)
async def create_admin_user(
    data: AdminUserCreate,
    admin: Annotated[AdminUser, Depends(require_permission("admin_users", "create"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Create a new admin user. Requires admin_users.create permission."""
    service = AdminAuthService(db)
    new_admin = await service.create_admin(data)

    await log_audit(
        db,
        admin_id=admin.id,
        action="create_admin_user",
        entity_type="admin_user",
        entity_id=str(new_admin.id),
        details={"email": new_admin.email, "role": new_admin.role},
        ip_address=request.client.host if request.client else None,
    )

    return AdminUserResponse(
        id=new_admin.id,
        email=new_admin.email,
        full_name=new_admin.full_name,
        role=new_admin.role,
        is_active=new_admin.is_active,
        last_login_at=new_admin.last_login_at,
        avatar_url=new_admin.avatar_url,
        created_at=new_admin.created_at,
        updated_at=new_admin.updated_at,
        permissions=[],
    )


@router.patch("/users/{admin_user_id}", response_model=AdminUserResponse)
async def update_admin_user(
    admin_user_id: uuid.UUID,
    data: AdminUserUpdate,
    admin: Annotated[AdminUser, Depends(require_permission("admin_users", "update"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Update an admin user. Requires admin_users.update permission."""
    service = AdminAuthService(db)
    updated = await service.update_admin(admin_user_id, data)

    await log_audit(
        db,
        admin_id=admin.id,
        action="update_admin_user",
        entity_type="admin_user",
        entity_id=str(admin_user_id),
        details=data.model_dump(exclude_unset=True, exclude={"password"}),
        ip_address=request.client.host if request.client else None,
    )

    return AdminUserResponse(
        id=updated.id,
        email=updated.email,
        full_name=updated.full_name,
        role=updated.role,
        is_active=updated.is_active,
        last_login_at=updated.last_login_at,
        avatar_url=updated.avatar_url,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        permissions=[
            PermissionResponse(
                id=p.id, resource=p.resource, action=p.action, granted=p.granted
            )
            for p in updated.permissions
        ],
    )


@router.delete("/users/{admin_user_id}")
async def delete_admin_user(
    admin_user_id: uuid.UUID,
    admin: Annotated[AdminUser, Depends(require_permission("admin_users", "delete"))],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """Delete an admin user. Requires admin_users.delete permission."""
    service = AdminAuthService(db)
    await service.delete_admin(admin_user_id)

    await log_audit(
        db,
        admin_id=admin.id,
        action="delete_admin_user",
        entity_type="admin_user",
        entity_id=str(admin_user_id),
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "Admin removido com sucesso"}


# ═══════════════════════════════════════════════════════════════
#  Permissions Management
# ═══════════════════════════════════════════════════════════════


@router.get("/permissions/available", response_model=AvailablePermissionsResponse)
async def get_available_permissions(
    admin: Annotated[AdminUser, Depends(get_current_admin_user)],
):
    """List all available resource/action combinations."""
    return AvailablePermissionsResponse(resources=RESOURCES_ACTIONS)


@router.put("/users/{admin_user_id}/permissions")
async def update_admin_permissions(
    admin_user_id: uuid.UUID,
    data: PermissionBulkUpdate,
    admin: Annotated[
        AdminUser, Depends(require_permission("admin_users", "manage_permissions"))
    ],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """
    Bulk update permissions for an admin user.
    Requires admin_users.manage_permissions permission.
    """
    service = AdminAuthService(db)
    new_perms = await service.update_permissions(admin_user_id, data)

    await log_audit(
        db,
        admin_id=admin.id,
        action="update_permissions",
        entity_type="admin_user",
        entity_id=str(admin_user_id),
        details={"permissions_count": len(new_perms)},
        ip_address=request.client.host if request.client else None,
    )

    return {
        "message": f"{len(new_perms)} permissões atualizadas",
        "permissions": [
            PermissionResponse(
                id=p.id, resource=p.resource, action=p.action, granted=p.granted
            )
            for p in new_perms
        ],
    }

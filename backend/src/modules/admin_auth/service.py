"""
═══════════════════════════════════════════════════════════════
  Admin Auth — Service Layer
  Handles login, token generation/verification, and admin CRUD.
  Uses bcrypt for password hashing, python-jose for JWT.
═══════════════════════════════════════════════════════════════
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.modules.admin_auth.models import (
    AdminPermission,
    AdminUser,
    DEFAULT_PERMISSIONS,
    RESOURCES_ACTIONS,
)
from src.modules.admin_auth.schemas import (
    AdminLoginRequest,
    AdminTokenResponse,
    AdminUserCreate,
    AdminUserUpdate,
    PermissionBulkUpdate,
)
from src.shared.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)

# ═══ PASSWORD HASHING (using hashlib + secrets — no extra dependency) ═══
# We use PBKDF2-SHA256 which is built into Python stdlib.
# This avoids adding bcrypt/passlib as a dependency.

_HASH_ITERATIONS = 260_000  # OWASP recommendation for PBKDF2-SHA256


def _hash_password(password: str) -> str:
    """Hash a password using PBKDF2-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), _HASH_ITERATIONS
    )
    return f"pbkdf2:sha256:{_HASH_ITERATIONS}${salt}${hash_bytes.hex()}"


def _verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a PBKDF2-SHA256 hash."""
    try:
        parts = password_hash.split("$")
        if len(parts) != 3:
            return False
        header, salt, stored_hash = parts
        iterations = int(header.split(":")[-1])
        hash_bytes = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations
        )
        return hash_bytes.hex() == stored_hash
    except (ValueError, IndexError):
        return False


# ═══ JWT TOKEN MANAGEMENT ═══

_ACCESS_TOKEN_EXPIRE_MINUTES = 30
_REFRESH_TOKEN_EXPIRE_DAYS = 7
_JWT_ALGORITHM = "HS256"


def _create_access_token(admin_user: AdminUser) -> str:
    """Create a short-lived JWT access token for admin panel."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin_user.id),
        "email": admin_user.email,
        "role": admin_user.role,
        "type": "admin",  # Differentiates from regular user JWTs
        "iat": now,
        "exp": now + timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.api_secret_key, algorithm=_JWT_ALGORITHM)


def _create_refresh_token(admin_user: AdminUser) -> str:
    """Create a long-lived refresh token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin_user.id),
        "type": "admin_refresh",
        "iat": now,
        "exp": now + timedelta(days=_REFRESH_TOKEN_EXPIRE_DAYS),
        "jti": secrets.token_hex(16),  # Unique token ID
    }
    return jwt.encode(payload, settings.api_secret_key, algorithm=_JWT_ALGORITHM)


def verify_admin_token(token: str) -> dict:
    """Verify and decode an admin JWT token."""
    try:
        payload = jwt.decode(
            token, settings.api_secret_key, algorithms=[_JWT_ALGORITHM]
        )
        if payload.get("type") != "admin":
            raise UnauthorizedException("Token inválido: tipo incorreto")
        return payload
    except JWTError as e:
        raise UnauthorizedException(f"Token inválido: {e!s}") from e


def _verify_refresh_token(token: str) -> dict:
    """Verify and decode a refresh token."""
    try:
        payload = jwt.decode(
            token, settings.api_secret_key, algorithms=[_JWT_ALGORITHM]
        )
        if payload.get("type") != "admin_refresh":
            raise UnauthorizedException("Refresh token inválido")
        return payload
    except JWTError as e:
        raise UnauthorizedException(f"Refresh token inválido: {e!s}") from e


# ═══ SERVICE CLASS ═══

class AdminAuthService:
    """Service for admin authentication and user management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── Authentication ───

    async def login(self, data: AdminLoginRequest) -> AdminTokenResponse:
        """Authenticate admin user and return JWT tokens."""
        result = await self.db.execute(
            select(AdminUser).where(AdminUser.email == data.email)
        )
        admin = result.scalar_one_or_none()

        if not admin or not _verify_password(data.password, admin.password_hash):
            raise UnauthorizedException("Email ou senha incorretos")

        if not admin.is_active:
            raise UnauthorizedException("Conta desativada")

        # Update last login
        admin.last_login_at = datetime.now(timezone.utc)

        # Generate tokens
        access_token = _create_access_token(admin)
        refresh_token = _create_refresh_token(admin)

        # Store refresh token hash for validation/revocation
        admin.refresh_token_hash = hashlib.sha256(
            refresh_token.encode()
        ).hexdigest()

        await self.db.flush()

        return AdminTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh(self, refresh_token: str) -> AdminTokenResponse:
        """Generate new access token using a valid refresh token."""
        payload = _verify_refresh_token(refresh_token)
        admin_id = payload.get("sub")

        result = await self.db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = result.scalar_one_or_none()

        if not admin or not admin.is_active:
            raise UnauthorizedException("Sessão inválida")

        # Verify refresh token matches stored hash
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        if admin.refresh_token_hash != token_hash:
            raise UnauthorizedException("Refresh token revogado")

        # Generate new tokens
        new_access = _create_access_token(admin)
        new_refresh = _create_refresh_token(admin)

        admin.refresh_token_hash = hashlib.sha256(
            new_refresh.encode()
        ).hexdigest()

        await self.db.flush()

        return AdminTokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            expires_in=_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def logout(self, admin_id: uuid.UUID) -> None:
        """Invalidate refresh token (logout)."""
        result = await self.db.execute(
            select(AdminUser).where(AdminUser.id == admin_id)
        )
        admin = result.scalar_one_or_none()
        if admin:
            admin.refresh_token_hash = None
            await self.db.flush()

    async def get_admin_by_id(self, admin_id: uuid.UUID) -> AdminUser:
        """Fetch admin user with permissions loaded."""
        result = await self.db.execute(
            select(AdminUser)
            .options(selectinload(AdminUser.permissions))
            .where(AdminUser.id == admin_id)
        )
        admin = result.scalar_one_or_none()
        if not admin:
            raise NotFoundException("Admin não encontrado")
        return admin

    # ─── Admin User CRUD ───

    async def create_admin(self, data: AdminUserCreate) -> AdminUser:
        """Create a new admin user with default permissions for their role."""
        # Check if email already exists
        existing = await self.db.execute(
            select(AdminUser).where(AdminUser.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise ConflictException("Email já cadastrado")

        valid_roles = {"super_admin", "campaign_manager", "regional_coordinator", "moderator", "analyst"}
        if data.role not in valid_roles:
            raise BadRequestException(f"Role inválido. Opções: {', '.join(valid_roles)}")

        admin = AdminUser(
            email=data.email,
            password_hash=_hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
        )
        self.db.add(admin)
        await self.db.flush()

        # Grant default permissions for the role
        default_perms = DEFAULT_PERMISSIONS.get(data.role, {})
        for resource, actions in default_perms.items():
            for action in actions:
                perm = AdminPermission(
                    admin_user_id=admin.id,
                    resource=resource,
                    action=action,
                    granted=True,
                )
                self.db.add(perm)

        await self.db.flush()
        return admin

    async def update_admin(
        self, admin_id: uuid.UUID, data: AdminUserUpdate
    ) -> AdminUser:
        """Update an existing admin user."""
        admin = await self.get_admin_by_id(admin_id)

        if data.email is not None and data.email != admin.email:
            existing = await self.db.execute(
                select(AdminUser).where(AdminUser.email == data.email)
            )
            if existing.scalar_one_or_none():
                raise ConflictException("Email já em uso")
            admin.email = data.email

        if data.full_name is not None:
            admin.full_name = data.full_name
        if data.role is not None:
            admin.role = data.role
        if data.is_active is not None:
            admin.is_active = data.is_active
        if data.password is not None:
            admin.password_hash = _hash_password(data.password)

        await self.db.flush()
        return admin

    async def delete_admin(self, admin_id: uuid.UUID) -> None:
        """Delete an admin user."""
        admin = await self.get_admin_by_id(admin_id)
        await self.db.delete(admin)
        await self.db.flush()

    async def list_admins(self) -> list[AdminUser]:
        """List all admin users with their permissions."""
        result = await self.db.execute(
            select(AdminUser)
            .options(selectinload(AdminUser.permissions))
            .order_by(AdminUser.created_at.desc())
        )
        return list(result.scalars().all())

    # ─── Permissions Management ───

    async def update_permissions(
        self, admin_id: uuid.UUID, data: PermissionBulkUpdate
    ) -> list[AdminPermission]:
        """Bulk update permissions for an admin user."""
        # Validate all resource.action combinations
        for perm in data.permissions:
            if perm.resource not in RESOURCES_ACTIONS:
                raise BadRequestException(f"Recurso inválido: {perm.resource}")
            if perm.action not in RESOURCES_ACTIONS[perm.resource]:
                raise BadRequestException(
                    f"Ação inválida '{perm.action}' para recurso '{perm.resource}'"
                )

        # Delete existing permissions
        await self.db.execute(
            delete(AdminPermission).where(AdminPermission.admin_user_id == admin_id)
        )

        # Create new permissions
        new_perms = []
        for perm in data.permissions:
            if perm.granted:
                p = AdminPermission(
                    admin_user_id=admin_id,
                    resource=perm.resource,
                    action=perm.action,
                    granted=True,
                )
                self.db.add(p)
                new_perms.append(p)

        await self.db.flush()
        return new_perms

    async def has_permission(
        self, admin_id: uuid.UUID, resource: str, action: str
    ) -> bool:
        """Check if an admin user has a specific permission."""
        # Super admin bypasses all checks
        result = await self.db.execute(
            select(AdminUser.role).where(AdminUser.id == admin_id)
        )
        role = result.scalar_one_or_none()
        if role == "super_admin":
            return True

        # Check specific permission
        result = await self.db.execute(
            select(AdminPermission).where(
                AdminPermission.admin_user_id == admin_id,
                AdminPermission.resource == resource,
                AdminPermission.action == action,
                AdminPermission.granted.is_(True),
            )
        )
        return result.scalar_one_or_none() is not None

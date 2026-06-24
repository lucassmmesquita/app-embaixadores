#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════
  Seed Script — Create first Super Admin
  
  Usage:
    cd backend
    source .venv/bin/activate
    python -m scripts.seed_admin --email admin@rede.com --password SenhaSegura123 --name "Admin Principal"
    
  Or with environment variables:
    ADMIN_EMAIL=admin@rede.com ADMIN_PASSWORD=SenhaSegura123 python -m scripts.seed_admin
═══════════════════════════════════════════════════════════════
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add backend root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.core.database import async_session_maker
from src.modules.admin_auth.models import AdminUser
from src.modules.admin_auth.service import _hash_password


async def create_super_admin(email: str, password: str, full_name: str) -> None:
    """Create the first super admin user."""
    async with async_session_maker() as session:
        # Check if already exists
        result = await session.execute(
            select(AdminUser).where(AdminUser.email == email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"⚠️  Admin com email '{email}' já existe (id: {existing.id})")
            print(f"   Role: {existing.role}, Ativo: {existing.is_active}")
            return

        # Create admin
        admin = AdminUser(
            email=email,
            password_hash=_hash_password(password),
            full_name=full_name,
            role="super_admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()

        print(f"✅ Super Admin criado com sucesso!")
        print(f"   ID: {admin.id}")
        print(f"   Email: {admin.email}")
        print(f"   Nome: {admin.full_name}")
        print(f"   Role: {admin.role}")
        print()
        print(f"🔐 Use essas credenciais para fazer login no painel admin.")


def main():
    parser = argparse.ArgumentParser(description="Criar primeiro Super Admin")
    parser.add_argument(
        "--email",
        default=os.getenv("ADMIN_EMAIL", "admin@rede.com"),
        help="Email do admin (default: admin@rede.com)",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("ADMIN_PASSWORD"),
        help="Senha do admin",
    )
    parser.add_argument(
        "--name",
        default=os.getenv("ADMIN_NAME", "Super Admin"),
        help="Nome completo (default: Super Admin)",
    )
    args = parser.parse_args()

    if not args.password:
        print("❌ Senha é obrigatória. Use --password ou ADMIN_PASSWORD env var.")
        sys.exit(1)

    if len(args.password) < 8:
        print("❌ Senha deve ter pelo menos 8 caracteres.")
        sys.exit(1)

    print()
    print("🏛️  Rede de Embaixadores — Criação de Super Admin")
    print("=" * 50)
    print()

    asyncio.run(create_super_admin(args.email, args.password, args.name))


if __name__ == "__main__":
    main()

"""
Alembic Environment — Async Migration Setup
"""

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# Add the backend directory to sys.path so 'src.' imports work
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.core.config import settings
from src.core.database import Base

# Import all models so Base.metadata reflects them
from src.modules.users.models import *  # noqa: F401, F403
from src.modules.gamification.models import *  # noqa: F401, F403
from src.modules.missions.models import *  # noqa: F401, F403
from src.modules.events.models import *  # noqa: F401, F403
from src.modules.content.models import *  # noqa: F401, F403
from src.modules.notifications.models import *  # noqa: F401, F403
from src.modules.invitations.models import *  # noqa: F401, F403
from src.shared.audit import AuditLog  # noqa: F401
from src.modules.admin_auth.models import *  # noqa: F401, F403

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override sqlalchemy.url with the async URL from settings
database_url = str(settings.database_url)
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode using async engine."""
    from sqlalchemy.ext.asyncio import create_async_engine

    _uses_pooler = settings.database_use_pooler or any(
        keyword in str(settings.database_url).lower()
        for keyword in ("pooler.supabase.com", "pgbouncer", "supavisor")
    )

    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
        connect_args=(
            {"statement_cache_size": 0, "prepared_statement_cache_size": 0}
            if _uses_pooler
            else {}
        ),
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()


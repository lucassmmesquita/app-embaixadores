"""
═══════════════════════════════════════════════════════════════
  Database — Async SQLAlchemy Engine & Session
═══════════════════════════════════════════════════════════════
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.core.config import settings


# ═══ ENGINE ═══
# Detect if using an external connection pooler (PgBouncer/Supavisor)
# These require disabling prepared statement caches in asyncpg
_uses_pooler = settings.database_use_pooler or any(
    keyword in settings.database_url.lower()
    for keyword in ("pooler.supabase.com", "pgbouncer", "supavisor")
)

engine = create_async_engine(
    settings.async_database_url,
    echo=settings.database_echo,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=(
        {"statement_cache_size": 0, "prepared_statement_cache_size": 0}
        if _uses_pooler
        else {}
    ),
)

# ═══ SESSION FACTORY ═══
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ═══ BASE MODEL ═══
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


# ═══ DEPENDENCY ═══
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a database session per request."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

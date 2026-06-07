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
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.database_echo,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
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

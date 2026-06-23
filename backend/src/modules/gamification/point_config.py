"""
═══════════════════════════════════════════════════════════════
  Point Config — Model & Service
  Configurações de pontos gerenciáveis pelo admin.
  Substitui constantes hardcoded por valores do banco.
═══════════════════════════════════════════════════════════════
"""

import time
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Integer, String, Text, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.shared.models import TimestampMixin


# ═══ MODEL ═══

class PointConfig(Base, TimestampMixin):
    """Configuração de pontos por ação. Gerenciável pelo admin."""
    __tablename__ = "point_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


# ═══ SERVICE (com cache em memória) ═══

class PointConfigService:
    """
    Carrega configurações de pontos do banco com cache TTL.
    Evita query a cada request — cache invalida a cada 5 minutos
    ou quando o admin atualiza um valor.
    """
    _cache: dict[str, int] = {}
    _cache_time: float = 0
    CACHE_TTL: int = 300  # 5 minutos

    @classmethod
    def invalidate_cache(cls) -> None:
        """Chamado pelo admin ao atualizar configurações."""
        cls._cache = {}
        cls._cache_time = 0

    @classmethod
    async def _load_cache(cls, db: AsyncSession) -> None:
        """Carrega todas as configs ativas do banco para memória."""
        result = await db.execute(
            select(PointConfig).where(PointConfig.is_active.is_(True))
        )
        configs = result.scalars().all()
        cls._cache = {c.key: c.points for c in configs}
        cls._cache_time = time.time()

    @classmethod
    async def get_points(cls, db: AsyncSession, key: str, default: int) -> int:
        """
        Retorna o valor de pontos para uma chave.
        Se não encontrado ou inativo, retorna o default.
        """
        # Verificar se cache precisa ser recarregado
        if not cls._cache or (time.time() - cls._cache_time) > cls.CACHE_TTL:
            await cls._load_cache(db)

        return cls._cache.get(key, default)

    @classmethod
    async def get_all(cls, db: AsyncSession) -> list[PointConfig]:
        """Lista todas as configurações (para admin)."""
        result = await db.execute(
            select(PointConfig).order_by(PointConfig.category, PointConfig.key)
        )
        return list(result.scalars().all())

    @classmethod
    async def get_by_key(cls, db: AsyncSession, key: str) -> PointConfig | None:
        """Busca uma configuração por chave."""
        result = await db.execute(
            select(PointConfig).where(PointConfig.key == key)
        )
        return result.scalar_one_or_none()

    @classmethod
    async def update_points(cls, db: AsyncSession, key: str, points: int) -> PointConfig | None:
        """Atualiza pontos de uma configuração e invalida cache."""
        config = await cls.get_by_key(db, key)
        if not config:
            return None

        config.points = points
        config.updated_at = datetime.now(timezone.utc)
        await db.flush()

        cls.invalidate_cache()
        return config

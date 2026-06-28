"""
═══════════════════════════════════════════════════════════════
  Push Provider — Abstract Interface (Port)
  Qualquer engine nova implementa essa interface.
  Para trocar de provider: criar nova classe e mudar get_providers().
═══════════════════════════════════════════════════════════════
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class PushResult:
    """Resultado de um envio de push."""
    success_count: int = 0
    failure_count: int = 0
    invalid_tokens: list[str] = field(default_factory=list)


class PushProvider(ABC):
    """Interface abstrata para providers de push notification."""

    @abstractmethod
    def supported_platforms(self) -> set[str]:
        """Retorna as plataformas suportadas (ex: {'ios', 'android'})."""
        ...

    @abstractmethod
    async def send_batch(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: dict | None = None,
    ) -> PushResult:
        """Envia push para uma lista de tokens. Retorna resultado."""
        ...

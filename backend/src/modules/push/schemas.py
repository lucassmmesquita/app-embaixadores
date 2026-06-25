"""
═══════════════════════════════════════════════════════════════
  Push Module — Schemas
  DTOs para registro/desregistro de tokens e mensagens push.
═══════════════════════════════════════════════════════════════
"""

from typing import Literal

from pydantic import BaseModel


class RegisterTokenRequest(BaseModel):
    """Request body para registrar um device token."""
    token: str
    platform: Literal["ios", "android", "web"]


class UnregisterTokenRequest(BaseModel):
    """Request body para desregistrar um device token."""
    token: str


class PushMessage(BaseModel):
    """Mensagem de push — formato agnóstico de provider."""
    title: str
    body: str
    data: dict | None = None
    sound: str = "default"

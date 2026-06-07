"""
═══════════════════════════════════════════════════════════════
  Core Configuration — Pydantic Settings
  All environment variables are loaded and validated here.
═══════════════════════════════════════════════════════════════
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ═══ APP ═══
    app_name: str = "Rede de Embaixadores API"
    environment: str = "development"
    debug: bool = True
    api_secret_key: str = "change-this-secret-key-in-production"

    # ═══ DATABASE ═══
    database_url: str = ""
    database_echo: bool = False

    # ═══ SUPABASE ═══
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # ═══ CORS ═══
    api_cors_origins: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006"

    # ═══ JWT ═══
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # ═══ PAGINATION ═══
    default_page_size: int = 20
    max_page_size: int = 100

    @property
    def cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.api_cors_origins.split(",")]

    @property
    def async_database_url(self) -> str:
        """Convert postgres:// to postgresql+asyncpg:// for async driver."""
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()

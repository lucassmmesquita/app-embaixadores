"""
═══════════════════════════════════════════════════════════════
  Supabase Client Factory
  Creates authenticated and service-role Supabase clients.
═══════════════════════════════════════════════════════════════
"""

from functools import lru_cache

from supabase import Client, create_client

from src.core.config import settings


@lru_cache
def get_supabase_admin() -> Client:
    """
    Returns a Supabase client using the service_role key.
    This bypasses RLS — use only for admin operations.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


def get_supabase_client(access_token: str | None = None) -> Client:
    """
    Returns a Supabase client.
    If an access_token is provided, it creates a user-scoped client
    that respects RLS policies.
    """
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key,
    )
    if access_token:
        client.auth.set_session(access_token, "")
    return client

"""
═══════════════════════════════════════════════════════════════
  Rate Limiter — In-memory rate limiting per user/action
  PRD §4.3: Rate limiting por usuário por tipo de missão
═══════════════════════════════════════════════════════════════
"""

import time
import uuid
from collections import defaultdict
from threading import Lock

from src.shared.exceptions import RateLimitException


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window counters.
    For production at scale, replace with Redis-based implementation.
    """

    def __init__(self):
        # {(user_id, action_type): [(timestamp, ...)]}
        self._actions: dict[tuple[str, str], list[float]] = defaultdict(list)
        self._lock = Lock()

    # Default limits per action type (max_count, window_seconds)
    DEFAULT_LIMITS: dict[str, tuple[int, int]] = {
        "content_share": (10, 86400),       # 10 shares/day
        "event_share": (10, 86400),         # 10 event shares/day
        "mission_submit": (20, 86400),      # 20 submissions/day
        "invite_create": (20, 86400),       # 20 invites/day
        "event_checkin": (5, 3600),         # 5 checkins/hour
    }

    def check(
        self,
        user_id: uuid.UUID,
        action_type: str,
        max_count: int | None = None,
        window_seconds: int | None = None,
    ) -> None:
        """
        Check if action is allowed. Raises RateLimitException if limit exceeded.
        """
        defaults = self.DEFAULT_LIMITS.get(action_type, (100, 86400))
        limit = max_count or defaults[0]
        window = window_seconds or defaults[1]

        key = (str(user_id), action_type)
        now = time.time()
        cutoff = now - window

        with self._lock:
            # Clean old entries
            self._actions[key] = [t for t in self._actions[key] if t > cutoff]

            if len(self._actions[key]) >= limit:
                raise RateLimitException(
                    f"Limite de {limit} ações do tipo '{action_type}' excedido. "
                    f"Tente novamente em {window // 3600}h."
                )

            # Record this action
            self._actions[key].append(now)

    def cleanup(self, max_age_seconds: int = 86400) -> None:
        """Remove entries older than max_age_seconds."""
        cutoff = time.time() - max_age_seconds
        with self._lock:
            keys_to_remove = []
            for key, timestamps in self._actions.items():
                self._actions[key] = [t for t in timestamps if t > cutoff]
                if not self._actions[key]:
                    keys_to_remove.append(key)
            for key in keys_to_remove:
                del self._actions[key]


# Singleton instance
rate_limiter = RateLimiter()

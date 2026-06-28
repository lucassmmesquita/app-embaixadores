"""
═══════════════════════════════════════════════════════════════
  Push Provider — Firebase Admin SDK (Adapter)
  Envia push para Web (PWA) via Firebase Cloud Messaging.
  Requer firebase-admin inicializado no startup.
═══════════════════════════════════════════════════════════════
"""

import json
import logging

from src.modules.push.providers.base import PushProvider, PushResult

logger = logging.getLogger(__name__)

# Module-level flag to avoid repeated import errors
_firebase_available = False

try:
    import firebase_admin
    from firebase_admin import credentials, messaging

    _firebase_available = True
except ImportError:
    logger.warning(
        "firebase-admin not installed — web push disabled. "
        "Install with: pip install firebase-admin"
    )


def init_firebase() -> None:
    """
    Inicializa Firebase Admin SDK (singleton, chamado uma vez no startup).
    Safe to call multiple times — no-op if already initialized or not configured.
    """
    if not _firebase_available:
        return

    if firebase_admin._apps:  # type: ignore[attr-defined]
        return  # Already initialized

    from src.core.config import settings

    if not settings.firebase_service_account_json:
        logger.info(
            "FIREBASE_SERVICE_ACCOUNT_JSON not set — web push disabled. "
            "This is expected in development."
        )
        return

    try:
        cred_json = json.loads(settings.firebase_service_account_json)
        cred = credentials.Certificate(cred_json)
        firebase_admin.initialize_app(cred)
        logger.info("✅ Firebase Admin SDK initialized (project: %s)", cred_json.get("project_id"))
    except Exception as e:
        logger.error("❌ Failed to initialize Firebase Admin SDK: %s", e)


class FirebasePushProvider(PushProvider):
    """Adapter: Firebase Admin SDK (FCM) para Web Push."""

    def supported_platforms(self) -> set[str]:
        return {"web"}

    async def send_batch(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: dict | None = None,
    ) -> PushResult:
        if not _firebase_available:
            logger.debug("Firebase not available — skipping web push")
            return PushResult()

        if not firebase_admin._apps:  # type: ignore[attr-defined]
            # Lazy init: handle uvicorn --reload losing state
            init_firebase()
            if not firebase_admin._apps:  # type: ignore[attr-defined]
                logger.debug("Firebase not initialized — skipping web push")
                return PushResult()

        success = 0
        failures = 0
        invalid: list[str] = []

        for token in tokens:
            msg = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in (data or {}).items()},
                token=token,
            )
            try:
                messaging.send(msg)
                success += 1
            except messaging.UnregisteredError:
                invalid.append(token)
                failures += 1
                logger.warning("FCM token unregistered: %s...", token[:20])
            except Exception as e:
                logger.error("FCM send error: %s", e)
                failures += 1

        return PushResult(
            success_count=success,
            failure_count=failures,
            invalid_tokens=invalid,
        )

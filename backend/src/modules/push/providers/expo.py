"""
═══════════════════════════════════════════════════════════════
  Push Provider — Expo Push API (Adapter)
  Envia push para iOS e Android via Expo Push Service.
  Endpoint: https://exp.host/--/api/v2/push/send
  Aceita até 100 mensagens por request.
═══════════════════════════════════════════════════════════════
"""

import logging

import httpx

from src.modules.push.providers.base import PushProvider, PushResult

logger = logging.getLogger(__name__)


class ExpoPushProvider(PushProvider):
    """Adapter: Expo Push API para iOS e Android."""

    EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
    BATCH_SIZE = 100  # Expo limit

    def supported_platforms(self) -> set[str]:
        return {"ios", "android"}

    async def send_batch(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: dict | None = None,
    ) -> PushResult:
        messages = [
            {
                "to": token,
                "title": title,
                "body": body,
                "data": data or {},
                "sound": "default",
            }
            for token in tokens
        ]

        success = 0
        failures = 0
        invalid: list[str] = []

        async with httpx.AsyncClient(timeout=30) as client:
            for i in range(0, len(messages), self.BATCH_SIZE):
                batch = messages[i : i + self.BATCH_SIZE]
                try:
                    resp = await client.post(self.EXPO_PUSH_URL, json=batch)
                    if resp.status_code == 200:
                        result_data = resp.json().get("data", [])
                        for j, ticket in enumerate(result_data):
                            if ticket.get("status") == "ok":
                                success += 1
                            else:
                                failures += 1
                                detail = ticket.get("details", {})
                                if detail.get("error") == "DeviceNotRegistered":
                                    invalid.append(batch[j]["to"])
                                logger.warning(
                                    "Expo push failed for token %s: %s",
                                    batch[j]["to"][:20],
                                    ticket.get("message", "unknown"),
                                )
                    else:
                        logger.error(
                            "Expo Push API HTTP %d: %s",
                            resp.status_code,
                            resp.text[:200],
                        )
                        failures += len(batch)
                except Exception as e:
                    logger.error("Expo Push API error: %s", e)
                    failures += len(batch)

        return PushResult(
            success_count=success,
            failure_count=failures,
            invalid_tokens=invalid,
        )

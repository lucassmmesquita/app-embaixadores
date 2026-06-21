"""
═══════════════════════════════════════════════════════════════
  Notifications Module — Service
  PRD §7.1.3: Comunicação segmentada — criar/segmentar campanhas
  // LEGAL-REVIEW: Disparo em massa requer consentimento + opt-out (PRD §8.2)
═══════════════════════════════════════════════════════════════
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.notifications.models import Notification, NotificationCampaign
from src.modules.users.models import Consent, Profile
from src.shared.exceptions import BadRequestException, NotFoundException


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_notification(
        self,
        title: str,
        body: str,
        notification_type: str = "info",
        user_id: uuid.UUID | None = None,
        action_url: str | None = None,
        target_level_id: uuid.UUID | None = None,
        target_region_id: uuid.UUID | None = None,
    ) -> Notification:
        """Create a single notification (used internally by other modules)."""
        notification = Notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type=notification_type,
            action_url=action_url,
            target_level_id=target_level_id,
            target_region_id=target_region_id,
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def get_user_notifications(
        self,
        user_id: uuid.UUID,
        unread_only: bool = False,
        limit: int = 50,
    ) -> list[Notification]:
        """Get notifications for a user (individual + broadcast matching criteria)."""
        query = select(Notification).where(
            (Notification.user_id == user_id) | (Notification.user_id.is_(None))
        )

        if unread_only:
            query = query.where(Notification.is_read.is_(False))

        query = query.order_by(Notification.sent_at.desc()).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def mark_as_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Mark a notification as read."""
        await self.db.execute(
            update(Notification)
            .where(Notification.id == notification_id)
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )

    async def mark_all_as_read(self, user_id: uuid.UUID) -> None:
        """Mark all notifications as read for a user."""
        await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.is_read.is_(False))
            .values(is_read=True, read_at=datetime.now(timezone.utc))
        )

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        """Get count of unread notifications."""
        result = await self.db.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        return result.scalar() or 0

    async def clear_all(self, user_id: uuid.UUID) -> int:
        """Delete all notifications for a user. Returns count deleted."""
        from sqlalchemy import delete
        count_result = await self.db.execute(
            select(func.count(Notification.id)).where(Notification.user_id == user_id)
        )
        count = count_result.scalar() or 0
        await self.db.execute(
            delete(Notification).where(Notification.user_id == user_id)
        )
        return count

    # ═══ CAMPAIGNS (PRD §7.1.3) ═══

    async def create_campaign(
        self,
        title: str,
        body: str,
        created_by: uuid.UUID,
        notification_type: str = "campaign",
        segment_level_id: uuid.UUID | None = None,
        segment_region_id: uuid.UUID | None = None,
        segment_role: str | None = None,
    ) -> NotificationCampaign:
        """
        Create a segmented notification campaign.
        // LEGAL-REVIEW: Verificar consentimento de comunicação dos destinatários (PRD §8.2)
        """
        campaign = NotificationCampaign(
            title=title,
            body=body,
            notification_type=notification_type,
            segment_level_id=segment_level_id,
            segment_region_id=segment_region_id,
            segment_role=segment_role,
            created_by=created_by,
            status="draft",
        )
        self.db.add(campaign)
        await self.db.flush()
        return campaign

    async def send_campaign(self, campaign_id: uuid.UUID) -> dict:
        """
        Send a campaign to all matching users.
        // LEGAL-REVIEW: Respeitar opt-out e consentimento de comunicação (PRD §8.2)
        """
        result = await self.db.execute(
            select(NotificationCampaign).where(NotificationCampaign.id == campaign_id)
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise NotFoundException("Campanha não encontrada")

        if campaign.status == "sent":
            raise BadRequestException("Campanha já enviada")

        # Build user query with segmentation
        user_query = select(Profile.id).where(Profile.is_active.is_(True))

        if campaign.segment_level_id:
            user_query = user_query.where(Profile.current_level_id == campaign.segment_level_id)
        if campaign.segment_region_id:
            user_query = user_query.where(Profile.region_id == campaign.segment_region_id)
        if campaign.segment_role:
            user_query = user_query.where(Profile.role == campaign.segment_role)

        # // LEGAL-REVIEW: Filter out users without communication consent (PRD §8.1, §8.2)
        users_with_consent = select(Consent.user_id).where(
            Consent.consent_type == "communication",
            Consent.granted.is_(True),
            Consent.revoked_at.is_(None),
        )
        user_query = user_query.where(Profile.id.in_(users_with_consent))

        user_ids_result = await self.db.execute(user_query)
        user_ids = [row[0] for row in user_ids_result.all()]

        # Create individual notifications
        sent_count = 0
        for uid in user_ids:
            notification = Notification(
                user_id=uid,
                title=campaign.title,
                body=campaign.body,
                notification_type=campaign.notification_type,
                campaign_id=campaign.id,
            )
            self.db.add(notification)
            sent_count += 1

        campaign.status = "sent"
        campaign.sent_count = sent_count
        campaign.sent_at = datetime.now(timezone.utc)

        await self.db.flush()
        return {
            "message": f"Campanha enviada para {sent_count} usuários",
            "sent_count": sent_count,
        }

    async def list_campaigns(self, limit: int = 50) -> list[NotificationCampaign]:
        """List all campaigns."""
        result = await self.db.execute(
            select(NotificationCampaign)
            .order_by(NotificationCampaign.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

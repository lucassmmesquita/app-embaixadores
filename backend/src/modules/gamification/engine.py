"""
═══════════════════════════════════════════════════════════════
  Gamification Module — Engine
  Core gamification logic: award points via ledger, check level-ups
  with parametrizable requirements, evaluate badge criteria, rankings.
═══════════════════════════════════════════════════════════════
"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.gamification.models import Activity, Badge, PointTransaction, UserBadge
from src.modules.users.models import Level, Profile


class GamificationEngine:
    """
    Central engine for all gamification mechanics.
    Called by other modules when actions are performed.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def award_points(
        self,
        user_id: uuid.UUID,
        points: int,
        action_type: str,
        description: str | None = None,
        reference_type: str | None = None,
        reference_id: uuid.UUID | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        """
        Award points to a user via the immutable ledger (PRD §5.1).
        Idempotent: duplicate idempotency_key will be silently skipped (PRD §4.3).
        Returns info about the points awarded and any level changes.
        """
        # Build idempotency key if not provided
        if not idempotency_key:
            idempotency_key = f"{user_id}:{reference_type or action_type}:{reference_id or uuid.uuid4()}"

        # Check idempotency — skip if already processed (PRD §4.3)
        existing = await self.db.execute(
            select(PointTransaction.id).where(PointTransaction.idempotency_key == idempotency_key)
        )
        if existing.scalar_one_or_none():
            return {
                "points_awarded": 0,
                "level_up": None,
                "new_badges": [],
                "already_processed": True,
            }

        # 1. Insert into immutable ledger (PRD §5.1)
        transaction = PointTransaction(
            user_id=user_id,
            points=points,
            transaction_type="credit",
            source_type=reference_type or action_type,
            source_id=reference_id,
            description=description,
            idempotency_key=idempotency_key,
        )
        self.db.add(transaction)

        # 2. Log the activity (separate from ledger)
        activity = Activity(
            user_id=user_id,
            action_type=action_type,
            action_description=description,
            points_awarded=points,
            reference_type=reference_type,
            reference_id=reference_id,
        )
        self.db.add(activity)

        # 3. Update materialized snapshot (PRD §5.1: snapshot for performance)
        await self.db.execute(
            update(Profile)
            .where(Profile.id == user_id)
            .values(total_points=Profile.total_points + points)
        )
        await self.db.flush()

        # 4. Check for level-up
        level_up = await self._check_level_up(user_id)

        # 5. Check for badge awards
        new_badges = await self._check_badge_criteria(user_id)

        return {
            "points_awarded": points,
            "level_up": level_up,
            "new_badges": new_badges,
            "already_processed": False,
        }

    async def _check_level_up(self, user_id: uuid.UUID) -> dict | None:
        """
        Check if user should level up based on current points AND extra requirements.
        PRD §3.1: Levels have min_points, min_missions_completed, min_referrals_active
        PRD §3.2: Levels 4/5 require approval (pending_approval state)
        PRD §3.2: Progression is monotonic (never lose level)
        """
        from src.modules.missions.models import UserMission

        result = await self.db.execute(
            select(Profile).options(selectinload(Profile.current_level)).where(Profile.id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return None

        current_order = profile.current_level.order_index if profile.current_level else 0

        # Find all levels above current, ordered ascending
        levels_result = await self.db.execute(
            select(Level)
            .where(Level.order_index > current_order)
            .order_by(Level.order_index.asc())
        )
        candidate_levels = list(levels_result.scalars().all())

        if not candidate_levels:
            return None

        # Count missions completed
        missions_result = await self.db.execute(
            select(func.count(UserMission.id))
            .where(UserMission.user_id == user_id, UserMission.status == "completed")
        )
        missions_completed = missions_result.scalar() or 0

        # Count active referrals
        referrals_result = await self.db.execute(
            select(func.count(Profile.id)).where(Profile.referred_by == user_id)
        )
        referrals_active = referrals_result.scalar() or 0

        # Find the highest level the user qualifies for
        new_level = None
        for level in candidate_levels:
            if profile.total_points < level.min_points:
                break
            if missions_completed < level.min_missions_completed:
                break
            if referrals_active < level.min_referrals_active:
                break

            if level.requires_approval:
                # PRD §3.2: Nível 4/5 exigem aprovação humana
                if not profile.level_pending_approval:
                    await self.db.execute(
                        update(Profile)
                        .where(Profile.id == user_id)
                        .values(level_pending_approval=True)
                    )
                    # Create notification for admin
                    from src.modules.notifications.models import Notification
                    notification = Notification(
                        title="Aprovação de nível pendente",
                        body=f"{profile.full_name} atingiu os requisitos para o nível {level.name} e aguarda aprovação.",
                        notification_type="level_approval",
                    )
                    self.db.add(notification)
                return {
                    "pending_approval": True,
                    "pending_level_name": level.name,
                    "pending_level_order": level.order_index,
                }
            else:
                new_level = level

        if new_level and (profile.current_level_id is None or new_level.id != profile.current_level_id):
            # Level up!
            await self.db.execute(
                update(Profile)
                .where(Profile.id == user_id)
                .values(current_level_id=new_level.id)
            )

            # Create notification for user
            from src.modules.notifications.models import Notification
            notification = Notification(
                user_id=user_id,
                title="🎉 Parabéns! Você subiu de nível!",
                body=f"Você alcançou o nível {new_level.name}!",
                notification_type="level_up",
            )
            self.db.add(notification)

            return {
                "new_level_name": new_level.name,
                "new_level_order": new_level.order_index,
                "new_level_color": new_level.color,
            }

        return None

    async def _check_badge_criteria(self, user_id: uuid.UUID) -> list[dict]:
        """Check and award badges based on criteria."""
        result = await self.db.execute(
            select(Profile).where(Profile.id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return []

        # Get all active badges the user doesn't have yet
        existing_badges_subq = select(UserBadge.badge_id).where(UserBadge.user_id == user_id)
        available_badges = await self.db.execute(
            select(Badge)
            .where(Badge.is_active.is_(True))
            .where(Badge.id.notin_(existing_badges_subq))
        )

        new_badges = []
        for badge in available_badges.scalars().all():
            should_award = False

            if badge.criteria_type == "points_threshold" and badge.criteria_value:
                should_award = profile.total_points >= badge.criteria_value

            elif badge.criteria_type == "missions_completed" and badge.criteria_value:
                from src.modules.missions.models import UserMission
                count_result = await self.db.execute(
                    select(func.count(UserMission.id))
                    .where(UserMission.user_id == user_id)
                    .where(UserMission.status == "completed")
                )
                count = count_result.scalar() or 0
                should_award = count >= badge.criteria_value

            elif badge.criteria_type == "events_attended" and badge.criteria_value:
                from src.modules.events.models import EventParticipant
                count_result = await self.db.execute(
                    select(func.count(EventParticipant.id))
                    .where(EventParticipant.user_id == user_id)
                    .where(EventParticipant.status == "attended")
                )
                count = count_result.scalar() or 0
                should_award = count >= badge.criteria_value

            elif badge.criteria_type == "referrals" and badge.criteria_value:
                count_result = await self.db.execute(
                    select(func.count(Profile.id))
                    .where(Profile.referred_by == user_id)
                )
                count = count_result.scalar() or 0
                should_award = count >= badge.criteria_value

            if should_award:
                user_badge = UserBadge(user_id=user_id, badge_id=badge.id)
                self.db.add(user_badge)
                new_badges.append({
                    "badge_name": badge.name,
                    "badge_description": badge.description,
                    "badge_rarity": badge.rarity,
                    "badge_icon_url": badge.icon_url,
                })

        if new_badges:
            await self.db.flush()

        return new_badges

    async def get_leaderboard(
        self, limit: int = 50, region_id: uuid.UUID | None = None
    ) -> list[dict]:
        """Get the top users ranked by points."""
        query = (
            select(Profile)
            .options(selectinload(Profile.current_level))
            .where(Profile.is_active.is_(True))
        )

        if region_id:
            query = query.where(Profile.region_id == region_id)

        query = query.order_by(Profile.total_points.desc(), Profile.created_at.asc()).limit(limit)
        result = await self.db.execute(query)

        leaderboard = []
        for rank, profile in enumerate(result.scalars().all(), start=1):
            leaderboard.append({
                "rank": rank,
                "user_id": profile.id,
                "full_name": profile.full_name,
                "avatar_url": profile.avatar_url,
                "total_points": profile.total_points,
                "level_name": profile.current_level.name if profile.current_level else None,
                "level_color": profile.current_level.color if profile.current_level else None,
                "city": profile.city,
            })

        return leaderboard

    async def get_user_rank(self, user_id: uuid.UUID) -> dict:
        """Get a user's rank position even if outside top-N (PRD §5.2)."""
        profile_result = await self.db.execute(
            select(Profile).where(Profile.id == user_id)
        )
        profile = profile_result.scalar_one_or_none()
        if not profile:
            return {"rank": 0}

        # Count users ranked above: more points, OR same points but registered earlier
        rank_result = await self.db.execute(
            select(func.count(Profile.id))
            .where(
                Profile.is_active.is_(True),
                (Profile.total_points > profile.total_points) |
                (
                    (Profile.total_points == profile.total_points) &
                    (Profile.created_at < profile.created_at)
                ),
            )
        )
        rank_position = (rank_result.scalar() or 0) + 1
        return {"rank": rank_position, "total_points": profile.total_points}

    async def get_points_history(
        self, user_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> list[PointTransaction]:
        """Get point transaction history for a user (ledger transparency — PRD §6.1.4)."""
        result = await self.db.execute(
            select(PointTransaction)
            .where(PointTransaction.user_id == user_id)
            .order_by(PointTransaction.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def reconcile_points(self, user_id: uuid.UUID) -> dict:
        """
        Reconcile materialized total_points vs ledger sum (PRD §5.1).
        Used periodically to ensure data integrity.
        """
        ledger_sum_result = await self.db.execute(
            select(func.sum(PointTransaction.points))
            .where(PointTransaction.user_id == user_id)
        )
        ledger_sum = ledger_sum_result.scalar() or 0

        profile_result = await self.db.execute(
            select(Profile.total_points).where(Profile.id == user_id)
        )
        current_total = profile_result.scalar() or 0

        if ledger_sum != current_total:
            await self.db.execute(
                update(Profile).where(Profile.id == user_id).values(total_points=ledger_sum)
            )
            return {"reconciled": True, "old_total": current_total, "new_total": ledger_sum}

        return {"reconciled": False, "total": current_total}

    async def get_user_stats(self, user_id: uuid.UUID) -> dict:
        """Get comprehensive stats for a user."""
        from src.modules.events.models import EventParticipant
        from src.modules.missions.models import UserMission

        # Profile with level
        profile_result = await self.db.execute(
            select(Profile).options(selectinload(Profile.current_level)).where(Profile.id == user_id)
        )
        profile = profile_result.scalar_one_or_none()
        if not profile:
            return {}

        # Next level
        next_level = None
        if profile.current_level:
            next_result = await self.db.execute(
                select(Level)
                .where(Level.order_index == profile.current_level.order_index + 1)
            )
            next_level = next_result.scalar_one_or_none()

        # Missions completed
        missions_result = await self.db.execute(
            select(func.count(UserMission.id))
            .where(UserMission.user_id == user_id, UserMission.status == "completed")
        )
        missions_completed = missions_result.scalar() or 0

        # Events attended
        events_result = await self.db.execute(
            select(func.count(EventParticipant.id))
            .where(EventParticipant.user_id == user_id, EventParticipant.status == "attended")
        )
        events_attended = events_result.scalar() or 0

        # Badges
        badges_result = await self.db.execute(
            select(UserBadge)
            .options(selectinload(UserBadge.badge))
            .where(UserBadge.user_id == user_id)
            .order_by(UserBadge.awarded_at.desc())
        )
        badges = list(badges_result.scalars().all())

        # Rank position (matches leaderboard tiebreaker: points desc, created_at asc)
        rank_result = await self.db.execute(
            select(func.count(Profile.id))
            .where(
                Profile.is_active.is_(True),
                (Profile.total_points > profile.total_points) |
                (
                    (Profile.total_points == profile.total_points) &
                    (Profile.created_at < profile.created_at)
                ),
            )
        )
        rank_position = (rank_result.scalar() or 0) + 1

        # Referrals
        referrals_result = await self.db.execute(
            select(func.count(Profile.id)).where(Profile.referred_by == user_id)
        )
        total_referrals = referrals_result.scalar() or 0

        # Recent activities
        activities_result = await self.db.execute(
            select(Activity)
            .where(Activity.user_id == user_id)
            .order_by(Activity.created_at.desc())
            .limit(10)
        )
        recent_activities = list(activities_result.scalars().all())

        # Progress calculation
        progress = 0.0
        points_to_next = 0
        if next_level and profile.current_level:
            level_range = next_level.min_points - profile.current_level.min_points
            user_progress = profile.total_points - profile.current_level.min_points
            progress = min((user_progress / level_range * 100) if level_range > 0 else 100, 100)
            points_to_next = max(next_level.min_points - profile.total_points, 0)

        return {
            "total_points": profile.total_points,
            "current_level_name": profile.current_level.name if profile.current_level else None,
            "current_level_order": profile.current_level.order_index if profile.current_level else 0,
            "next_level_name": next_level.name if next_level else None,
            "points_to_next_level": points_to_next,
            "progress_percentage": round(progress, 1),
            "total_missions_completed": missions_completed,
            "total_events_attended": events_attended,
            "total_badges": len(badges),
            "rank_position": rank_position,
            "total_referrals": total_referrals,
            "level_pending_approval": profile.level_pending_approval,
            "recent_activities": recent_activities,
            "badges": badges,
        }

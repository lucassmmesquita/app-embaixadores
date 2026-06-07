"""
═══════════════════════════════════════════════════════════════
  Gamification Module — Engine
  Core gamification logic: award points, check level-ups,
  evaluate badge criteria, calculate rankings.
═══════════════════════════════════════════════════════════════
"""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.gamification.models import Activity, Badge, UserBadge
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
    ) -> dict:
        """
        Award points to a user and check for level-up.
        Returns info about the points awarded and any level changes.
        """
        # Log the activity
        activity = Activity(
            user_id=user_id,
            action_type=action_type,
            action_description=description,
            points_awarded=points,
            reference_type=reference_type,
            reference_id=reference_id,
        )
        self.db.add(activity)

        # Update total points
        await self.db.execute(
            update(Profile)
            .where(Profile.id == user_id)
            .values(total_points=Profile.total_points + points)
        )
        await self.db.flush()

        # Check for level-up
        level_up = await self._check_level_up(user_id)

        # Check for badge awards
        new_badges = await self._check_badge_criteria(user_id)

        return {
            "points_awarded": points,
            "level_up": level_up,
            "new_badges": new_badges,
        }

    async def _check_level_up(self, user_id: uuid.UUID) -> dict | None:
        """Check if user should level up based on current points."""
        result = await self.db.execute(
            select(Profile).where(Profile.id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return None

        # Find the appropriate level for current points
        level_result = await self.db.execute(
            select(Level)
            .where(Level.min_points <= profile.total_points)
            .order_by(Level.order_index.desc())
            .limit(1)
        )
        new_level = level_result.scalar_one_or_none()

        if new_level and (profile.current_level_id is None or new_level.id != profile.current_level_id):
            # Level up!
            await self.db.execute(
                update(Profile)
                .where(Profile.id == user_id)
                .values(current_level_id=new_level.id)
            )
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

        query = query.order_by(Profile.total_points.desc()).limit(limit)
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

        # Rank position
        rank_result = await self.db.execute(
            select(func.count(Profile.id))
            .where(Profile.total_points > profile.total_points, Profile.is_active.is_(True))
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
            "recent_activities": recent_activities,
            "badges": badges,
        }

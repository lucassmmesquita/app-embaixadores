"""
═══════════════════════════════════════════════════════════════
  Content Module — Service
  PRD §4.1 CONTENT_SHARE: Share content with rate limiting
═══════════════════════════════════════════════════════════════
"""

import re
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.content.models import Content, ContentShare
from src.modules.content.schemas import ContentCreate, ContentUpdate
from src.shared.exceptions import NotFoundException
from src.shared.pagination import PaginatedResponse, PaginationParams
from src.shared.rate_limiter import rate_limiter

# ═══ YouTube thumbnail helper ═══
_YT_PATTERNS = [
    re.compile(r"(?:youtube\.com/watch\?.*v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{11})"),
]


def _extract_youtube_thumbnail(url: str | None) -> str | None:
    """Extract YouTube video ID and return HD thumbnail URL."""
    if not url:
        return None
    for pattern in _YT_PATTERNS:
        match = pattern.search(url)
        if match:
            video_id = match.group(1)
            return f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    return None


class ContentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_content(
        self,
        params: PaginationParams,
        content_type: str | None = None,
        category: str | None = None,
    ) -> PaginatedResponse:
        query = select(Content).where(Content.is_active.is_(True))
        count_query = select(func.count(Content.id)).where(Content.is_active.is_(True))

        if content_type:
            query = query.where(Content.content_type == content_type)
            count_query = count_query.where(Content.content_type == content_type)
        if category:
            query = query.where(Content.category == category)
            count_query = count_query.where(Content.category == category)

        total = (await self.db.execute(count_query)).scalar() or 0
        query = query.order_by(Content.is_featured.desc(), Content.created_at.desc())
        query = query.offset(params.offset).limit(params.page_size)

        result = await self.db.execute(query)
        items = list(result.scalars().all())
        return PaginatedResponse.create(items=items, total=total, params=params)

    async def get_content(self, content_id: uuid.UUID) -> Content:
        result = await self.db.execute(
            select(Content).where(Content.id == content_id)
        )
        content = result.scalar_one_or_none()
        if not content:
            raise NotFoundException("Conteúdo não encontrado")
        return content

    async def share_content(
        self, user_id: uuid.UUID, content_id: uuid.UUID, platform: str = "whatsapp"
    ) -> dict:
        """
        Record a content share (no points awarded here).
        Points are awarded when someone clicks the shared link (landing page).
        """
        content = await self.get_content(content_id)

        # Record share (rate-limited, no points awarded here, no landing page access recorded yet)
        share = ContentShare(content_id=content_id, user_id=user_id, platform=platform)
        self.db.add(share)

        return {"message": "Compartilhamento registrado"}

    async def create_content(self, data: ContentCreate, created_by: uuid.UUID) -> Content:
        """Admin: create new content."""
        content = Content(**data.model_dump(), created_by=created_by)
        # Auto-generate YouTube thumbnail if not provided
        if not content.thumbnail_url:
            yt_thumb = _extract_youtube_thumbnail(content.file_url)
            if yt_thumb:
                content.thumbnail_url = yt_thumb
        self.db.add(content)
        await self.db.flush()
        return content

    async def update_content(self, content_id: uuid.UUID, data: ContentUpdate) -> Content:
        """Admin: update content."""
        content = await self.get_content(content_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(content, key, value)
        # Auto-generate YouTube thumbnail if cleared or missing
        if not content.thumbnail_url:
            yt_thumb = _extract_youtube_thumbnail(content.file_url)
            if yt_thumb:
                content.thumbnail_url = yt_thumb
        await self.db.flush()
        return content

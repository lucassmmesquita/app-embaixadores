"""
═══════════════════════════════════════════════════════════════
  Shared Pagination — Cursor and offset pagination utilities
═══════════════════════════════════════════════════════════════
"""

from pydantic import BaseModel, Field

from src.core.config import settings


class PaginationParams(BaseModel):
    """Query parameters for pagination."""

    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(
        default=settings.default_page_size,
        ge=1,
        le=settings.max_page_size,
        description="Items per page",
    )

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel):
    """Standardized paginated response wrapper."""

    items: list = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0

    @classmethod
    def create(cls, items: list, total: int, params: PaginationParams):
        total_pages = (total + params.page_size - 1) // params.page_size if total > 0 else 0
        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
        )

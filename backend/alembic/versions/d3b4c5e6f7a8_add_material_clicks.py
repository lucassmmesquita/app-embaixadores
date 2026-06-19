"""Add material_clicks table

Revision ID: d3b4c5e6f7a8
Revises: c2a3f4e5d6b7
Create Date: 2026-06-19 02:56:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "d3b4c5e6f7a8"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "material_clicks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("content_id", UUID(as_uuid=True), sa.ForeignKey("content.id", ondelete="CASCADE"), nullable=False),
        sa.Column("referrer_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("visitor_hash", sa.String(64), nullable=False),
        sa.Column("points_awarded", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("clicked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Unique constraint to prevent duplicate click tracking
    op.create_index(
        "ix_material_clicks_unique",
        "material_clicks",
        ["content_id", "referrer_id", "visitor_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_material_clicks_unique", table_name="material_clicks")
    op.drop_table("material_clicks")

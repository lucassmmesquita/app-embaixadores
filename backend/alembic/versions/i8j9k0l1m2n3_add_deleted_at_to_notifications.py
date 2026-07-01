"""add deleted_at to notifications for soft delete

Revision ID: i8j9k0l1m2n3
Revises: 1ce55a14588c
Create Date: 2026-07-01 02:38:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'i8j9k0l1m2n3'
down_revision: Union[str, None] = '1ce55a14588c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('notifications', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_notifications_deleted_at', 'notifications', ['deleted_at'])


def downgrade() -> None:
    op.drop_index('ix_notifications_deleted_at', table_name='notifications')
    op.drop_column('notifications', 'deleted_at')

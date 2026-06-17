"""add_admin_users_and_permissions

Revision ID: a1b2c3d4e5f6
Revises: c2a3f4e5d6b7
Create Date: 2026-06-16 20:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c2a3f4e5d6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ═══ admin_users table ═══
    op.create_table(
        'admin_users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('password_hash', sa.String(length=128), nullable=False),
        sa.Column('full_name', sa.String(length=300), nullable=False),
        sa.Column('role', sa.String(length=30), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('refresh_token_hash', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_admin_users_email', 'admin_users', ['email'], unique=True)

    # ═══ admin_permissions table ═══
    op.create_table(
        'admin_permissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('admin_user_id', sa.UUID(), nullable=False),
        sa.Column('resource', sa.String(length=50), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('granted', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['admin_user_id'], ['admin_users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('admin_user_id', 'resource', 'action', name='uq_admin_permission'),
    )
    op.create_index('ix_admin_permissions_admin_user_id', 'admin_permissions', ['admin_user_id'])


def downgrade() -> None:
    op.drop_table('admin_permissions')
    op.drop_table('admin_users')

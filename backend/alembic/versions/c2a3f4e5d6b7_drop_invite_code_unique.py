"""drop invite_code unique constraint

Revision ID: c2a3f4e5d6b7
Revises: b6be05ce10f5
Create Date: 2026-06-09 01:40:00.000000+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2a3f4e5d6b7'
down_revision: Union[str, None] = 'b6be05ce10f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the unique constraint on invite_code
    # The constraint was auto-named by SQLAlchemy as 'invitations_invite_code_key'
    # Multiple shares now use the same referral_code as invite_code
    op.drop_constraint('invitations_invite_code_key', 'invitations', type_='unique')
    # Add a regular index instead for query performance
    op.create_index('ix_invitations_invite_code', 'invitations', ['invite_code'])

    # Also drop the unique constraints on invitee_email/phone since
    # we now allow multiple pending invitations (shares) from the same user
    op.drop_constraint('uq_invitation_email', 'invitations', type_='unique')
    op.drop_constraint('uq_invitation_phone', 'invitations', type_='unique')


def downgrade() -> None:
    op.create_unique_constraint('uq_invitation_phone', 'invitations', ['inviter_id', 'invitee_phone'])
    op.create_unique_constraint('uq_invitation_email', 'invitations', ['inviter_id', 'invitee_email'])
    op.drop_index('ix_invitations_invite_code', table_name='invitations')
    op.create_unique_constraint('invitations_invite_code_key', 'invitations', ['invite_code'])

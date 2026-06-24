"""fix audit_logs admin_id FK: profiles -> admin_users

Revision ID: f5g6h7i8j9k0
Revises: e4f5g6h7i8j9
Create Date: 2026-06-24 19:30:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'f5g6h7i8j9k0'
down_revision = 'e4f5g6h7i8j9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the incorrect FK pointing to profiles
    op.drop_constraint('audit_logs_admin_id_fkey', 'audit_logs', type_='foreignkey')
    # Create the correct FK pointing to admin_users
    op.create_foreign_key(
        'audit_logs_admin_id_fkey',
        'audit_logs', 'admin_users',
        ['admin_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('audit_logs_admin_id_fkey', 'audit_logs', type_='foreignkey')
    op.create_foreign_key(
        'audit_logs_admin_id_fkey',
        'audit_logs', 'profiles',
        ['admin_id'], ['id'],
    )

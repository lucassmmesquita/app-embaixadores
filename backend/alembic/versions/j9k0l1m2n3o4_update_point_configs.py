"""update point configs: remove unused and rename labels

Revision ID: j9k0l1m2n3o4
Revises: i8j9k0l1m2n3
Create Date: 2026-07-09 03:29:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "j9k0l1m2n3o4"
down_revision: str | None = "i8j9k0l1m2n3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Remove unused configs
    op.execute("DELETE FROM point_configs WHERE key IN ('material_landing_click', 'event_share')")

    # Update label
    op.execute("""
        UPDATE point_configs 
        SET label = 'Clique em página de evento',
            description = 'Pontos concedidos ao referrer quando alguém clica na página do evento'
        WHERE key = 'event_landing_click';
    """)


def downgrade() -> None:
    # Revert label
    op.execute("""
        UPDATE point_configs 
        SET label = 'Clique em landing de evento',
            description = 'Pontos concedidos ao referrer quando alguém clica na landing page do evento'
        WHERE key = 'event_landing_click';
    """)

    # Restore deleted configs
    op.execute("""
        INSERT INTO point_configs (key, points, label, description, category)
        VALUES 
            ('material_landing_click', 10, 'Clique em landing de material', 'Pontos concedidos ao referrer quando alguém clica na landing page do material', 'content'),
            ('event_share', 10, 'Compartilhamento de evento', 'Pontos concedidos ao embaixador ao compartilhar um evento', 'events')
        ON CONFLICT (key) DO NOTHING;
    """)

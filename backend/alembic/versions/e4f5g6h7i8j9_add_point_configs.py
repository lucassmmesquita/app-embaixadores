"""add point_configs table

Revision ID: e4f5g6h7i8j9
Revises: d3b4c5e6f7a8
Create Date: 2026-06-22 20:06:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'e4f5g6h7i8j9'
down_revision = 'd3b4c5e6f7a8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'point_configs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('key', sa.String(100), unique=True, nullable=False),
        sa.Column('points', sa.Integer, nullable=False),
        sa.Column('label', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(50), nullable=False, server_default='general'),
        sa.Column('is_active', sa.Boolean, server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # Inserir valores padrão (idempotente)
    op.execute("""
        INSERT INTO point_configs (key, points, label, description, category) VALUES
        ('registration', 5, 'Bônus de cadastro', 'Pontos concedidos ao novo usuário ao se cadastrar', 'auth'),
        ('referral_bonus', 10, 'Bônus de indicação', 'Pontos concedidos ao quem indicou quando alguém usa seu código', 'auth'),
        ('invite_accepted', 30, 'Convite aceito', 'Pontos concedidos ao quem convidou quando o convite é aceito', 'invitations'),
        ('invite_validated', 30, 'Convite validado', 'Pontos concedidos ao quem convidou quando o convidado completa a 1ª missão', 'missions'),
        ('event_landing_click', 10, 'Clique em landing de evento', 'Pontos concedidos ao referrer quando alguém clica na landing page do evento', 'events'),
        ('material_landing_click', 10, 'Clique em landing de material', 'Pontos concedidos ao referrer quando alguém clica na landing page do material', 'content')
        ON CONFLICT (key) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_table('point_configs')

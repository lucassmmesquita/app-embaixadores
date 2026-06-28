"""add system_notification_configs table with seed data

Revision ID: h7i8j9k0l1m2
Revises: g6h7i8j9k0l1
Create Date: 2026-06-25 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid


# revision identifiers, used by Alembic.
revision = 'h7i8j9k0l1m2'
down_revision = 'g6h7i8j9k0l1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create table
    op.create_table(
        'system_notification_configs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('event_key', sa.String(50), unique=True, nullable=False),
        sa.Column('label', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=False, server_default=''),
        sa.Column('title_template', sa.String(300), nullable=False),
        sa.Column('body_template', sa.Text, nullable=False),
        sa.Column('notification_type', sa.String(20), nullable=False),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Seed data
    configs_table = sa.table(
        'system_notification_configs',
        sa.column('id', UUID(as_uuid=True)),
        sa.column('event_key', sa.String),
        sa.column('label', sa.String),
        sa.column('description', sa.Text),
        sa.column('title_template', sa.String),
        sa.column('body_template', sa.Text),
        sa.column('notification_type', sa.String),
        sa.column('is_active', sa.Boolean),
    )

    op.bulk_insert(configs_table, [
        {
            'id': uuid.uuid4(),
            'event_key': 'mission_completed',
            'label': 'Missão Completada',
            'description': 'Enviada quando um embaixador completa uma missão e ganha pontos.',
            'title_template': 'Missão concluída!',
            'body_template': 'Você completou "{mission_name}" e ganhou {points} pontos!',
            'notification_type': 'mission',
            'is_active': True,
        },
        {
            'id': uuid.uuid4(),
            'event_key': 'level_up',
            'label': 'Subiu de Nível',
            'description': 'Enviada quando um embaixador alcança um novo nível na plataforma.',
            'title_template': 'Parabéns! Você subiu de nível!',
            'body_template': 'Você alcançou o nível {level_name}! Continue assim!',
            'notification_type': 'level_up',
            'is_active': True,
        },
        {
            'id': uuid.uuid4(),
            'event_key': 'badge_awarded',
            'label': 'Conquista',
            'description': 'Enviada quando um embaixador alcança uma nova conquista.',
            'title_template': 'Nova conquista',
            'body_template': 'Você possui uma nova conquista {badge_name}',
            'notification_type': 'badge',
            'is_active': True,
        },
        {
            'id': uuid.uuid4(),
            'event_key': 'event_checkin',
            'label': 'Check-in em Evento',
            'description': 'Enviada após check-in confirmado em um evento.',
            'title_template': 'Check-in confirmado!',
            'body_template': 'Seu check-in no evento "{event_name}" foi confirmado. Você ganhou {points} pontos!',
            'notification_type': 'event',
            'is_active': True,
        },
        {
            'id': uuid.uuid4(),
            'event_key': 'invite_accepted',
            'label': 'Convite Aceito',
            'description': 'Enviada quando um convidado verificou sua conta.',
            'title_template': 'Seu convite foi aceito!',
            'body_template': 'Um convidado seu verificou a conta e você ganhou {points} pontos!',
            'notification_type': 'invite',
            'is_active': True,
        },
        {
            'id': uuid.uuid4(),
            'event_key': 'new_event',
            'label': 'Novo Evento Disponível',
            'description': 'Enviada quando um novo evento é criado (disparo manual pelo admin).',
            'title_template': 'Novo evento disponível!',
            'body_template': '{event_name} — Inscreva-se e garanta seus pontos!',
            'notification_type': 'event',
            'is_active': True,
        },
    ])


def downgrade() -> None:
    op.drop_table('system_notification_configs')

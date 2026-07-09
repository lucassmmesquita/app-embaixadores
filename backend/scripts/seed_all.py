"""
═══════════════════════════════════════════════════════════════
  Seed All — Popula banco local com dados base do Supabase
  Dados de referência: levels, regions, badges, categories, missions
  Idempotente: pode rodar múltiplas vezes sem duplicar dados
═══════════════════════════════════════════════════════════════

Usage:
  docker compose run --rm api python -m scripts.seed_all
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# ═══ DATABASE SETUP ═══
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("❌ DATABASE_URL não definida. Configure no .env ou como variável de ambiente.")
    sys.exit(1)

ASYNC_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
if ASYNC_URL.startswith("postgres://"):
    ASYNC_URL = ASYNC_URL.replace("postgres://", "postgresql+asyncpg://", 1)

_uses_pooler = any(
    kw in DATABASE_URL.lower()
    for kw in ("pooler.supabase.com", "pgbouncer", "supavisor")
)

engine = create_async_engine(
    ASYNC_URL,
    echo=False,
    connect_args=(
        {"statement_cache_size": 0, "prepared_statement_cache_size": 0}
        if _uses_pooler
        else {}
    ),
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ═══════════════════════════════════════════════════════════════
#  DATA — Baseado nos dados atuais do Supabase
# ═══════════════════════════════════════════════════════════════

LEVELS = [
    {
        "name": "Apoiador",
        "slug": "apoiador",
        "description": "Bem-vindo à rede! Comece participando das atividades básicas da campanha.",
        "order_index": 1,
        "min_points": 0,
        "max_points": 99,
        "color": "#60A5FA",
        "min_missions_completed": 0,
        "min_referrals_active": 0,
        "requires_approval": False,
    },
    {
        "name": "Embaixador",
        "slug": "embaixador",
        "description": "Você já mostrou comprometimento. Novas missões e conteúdos exclusivos estão disponíveis.",
        "order_index": 2,
        "min_points": 100,
        "max_points": 499,
        "color": "#34D399",
        "min_missions_completed": 0,
        "min_referrals_active": 0,
        "requires_approval": False,
    },
    {
        "name": "Mobilizador",
        "slug": "mobilizador",
        "description": "Você é um agente de mudança. Organize encontros e amplie a rede.",
        "order_index": 3,
        "min_points": 500,
        "max_points": 1499,
        "color": "#FBBF24",
        "min_missions_completed": 0,
        "min_referrals_active": 0,
        "requires_approval": False,
    },
    {
        "name": "Líder Comunitário",
        "slug": "lider-comunitario",
        "description": "Sua dedicação é inspiradora. Coordene ações em sua região.",
        "order_index": 4,
        "min_points": 1500,
        "max_points": 4999,
        "color": "#F97316",
        "min_missions_completed": 0,
        "min_referrals_active": 0,
        "requires_approval": True,
    },
    {
        "name": "Coordenador de Rede",
        "slug": "coordenador-de-rede",
        "description": "O mais alto nível de reconhecimento. Você é parte estratégica da campanha.",
        "order_index": 5,
        "min_points": 5000,
        "max_points": None,
        "color": "#EF4444",
        "min_missions_completed": 0,
        "min_referrals_active": 0,
        "requires_approval": True,
    },
]

REGIONS = [
    {"name": "Centro", "slug": "centro", "city": "São Paulo", "state": "SP"},
    {"name": "Zona Norte", "slug": "zona-norte", "city": "São Paulo", "state": "SP"},
    {"name": "Zona Sul", "slug": "zona-sul", "city": "São Paulo", "state": "SP"},
    {"name": "Zona Leste", "slug": "zona-leste", "city": "São Paulo", "state": "SP"},
    {"name": "Zona Oeste", "slug": "zona-oeste", "city": "São Paulo", "state": "SP"},
    {"name": "Grande ABC", "slug": "grande-abc", "city": "Santo André", "state": "SP"},
    {"name": "Guarulhos", "slug": "guarulhos", "city": "Guarulhos", "state": "SP"},
    {"name": "Osasco", "slug": "osasco", "city": "Osasco", "state": "SP"},
]

MISSION_CATEGORIES = [
    {"name": "Engajamento Digital", "slug": "engajamento-digital", "icon": "📱", "color": "#3B82F6", "order_index": 1},
    {"name": "Presencial", "slug": "presencial", "icon": "🤝", "color": "#10B981", "order_index": 2},
    {"name": "Formação", "slug": "formacao", "icon": "📚", "color": "#8B5CF6", "order_index": 3},
    {"name": "Mobilização", "slug": "mobilizacao", "icon": "📣", "color": "#F59E0B", "order_index": 4},
    {"name": "Comunidade", "slug": "comunidade", "icon": "🏘️", "color": "#EF4444", "order_index": 5},
    {"name": "Especial", "slug": "especial", "icon": "⭐", "color": "#EC4899", "order_index": 6},
]

BADGES = [
    {"name": "Primeiro Passo", "description": "Completou sua primeira missão", "category": "milestone", "rarity": "common", "criteria_type": "missions_completed", "criteria_value": 1},
    {"name": "Engajado", "description": "Completou 5 missões", "category": "achievement", "rarity": "common", "criteria_type": "missions_completed", "criteria_value": 5},
    {"name": "Dedicado", "description": "Completou 15 missões", "category": "achievement", "rarity": "uncommon", "criteria_type": "missions_completed", "criteria_value": 15},
    {"name": "Incansável", "description": "Completou 50 missões", "category": "achievement", "rarity": "rare", "criteria_type": "missions_completed", "criteria_value": 50},
    {"name": "Lenda", "description": "Completou 100 missões", "category": "achievement", "rarity": "legendary", "criteria_type": "missions_completed", "criteria_value": 100},
    {"name": "Pontuação 100", "description": "Alcançou 100 pontos", "category": "milestone", "rarity": "common", "criteria_type": "points_threshold", "criteria_value": 100},
    {"name": "Pontuação 500", "description": "Alcançou 500 pontos", "category": "milestone", "rarity": "uncommon", "criteria_type": "points_threshold", "criteria_value": 500},
    {"name": "Pontuação 1500", "description": "Alcançou 1500 pontos", "category": "milestone", "rarity": "rare", "criteria_type": "points_threshold", "criteria_value": 1500},
    {"name": "Pontuação 5000", "description": "Alcançou 5000 pontos", "category": "milestone", "rarity": "epic", "criteria_type": "points_threshold", "criteria_value": 5000},
    {"name": "Participante Ativo", "description": "Participou de 3 eventos", "category": "event", "rarity": "common", "criteria_type": "events_attended", "criteria_value": 3},
    {"name": "Frequentador", "description": "Participou de 10 eventos", "category": "event", "rarity": "uncommon", "criteria_type": "events_attended", "criteria_value": 10},
    {"name": "Presença Garantida", "description": "Participou de 25 eventos", "category": "event", "rarity": "rare", "criteria_type": "events_attended", "criteria_value": 25},
    {"name": "Multiplicador", "description": "Indicou 3 novos embaixadores", "category": "achievement", "rarity": "common", "criteria_type": "referrals", "criteria_value": 3},
    {"name": "Recrutador", "description": "Indicou 10 novos embaixadores", "category": "achievement", "rarity": "uncommon", "criteria_type": "referrals", "criteria_value": 10},
    {"name": "Formador de Rede", "description": "Indicou 25 novos embaixadores", "category": "achievement", "rarity": "rare", "criteria_type": "referrals", "criteria_value": 25},
    {"name": "Super Recrutador", "description": "Indicou 50 novos embaixadores", "category": "achievement", "rarity": "epic", "criteria_type": "referrals", "criteria_value": 50},
]

MISSIONS = [
    {
        "title": "Compartilhe nas redes sociais",
        "description": "Compartilhe um conteúdo oficial da campanha nas suas redes sociais (WhatsApp, Instagram, Facebook ou Twitter).",
        "category_slug": "engajamento-digital",
        "action_type": "CONTENT_SHARE",
        "recurrence": "DAILY",
        "points_reward": 10,
        "required_count": 1,
        "is_featured": True,
        "requires_verification": False,
        "is_self_declared": True,
        "max_daily_completions": 3,
    },
    {
        "title": "Convide um amigo",
        "description": "Convide um amigo para participar da Rede de Embaixadores usando seu código de indicação.",
        "category_slug": "mobilizacao",
        "action_type": "INVITE",
        "recurrence": "ONE_TIME",
        "points_reward": 25,
        "required_count": 1,
        "is_featured": True,
        "requires_verification": False,
        "is_self_declared": False,
    },
    {
        "title": "Participe de um evento",
        "description": "Confirme presença e faça check-in em um evento da campanha.",
        "category_slug": "presencial",
        "action_type": "EVENT_ATTENDANCE",
        "recurrence": "PER_EVENT",
        "points_reward": 30,
        "required_count": 1,
        "is_featured": True,
        "requires_verification": False,
        "is_self_declared": False,
    },
    {
        "title": "Complete seu perfil",
        "description": "Preencha todos os campos do seu perfil para que possamos conhecer você melhor.",
        "category_slug": "engajamento-digital",
        "action_type": "TRAINING",
        "recurrence": "ONE_TIME",
        "points_reward": 15,
        "required_count": 1,
        "is_featured": False,
        "requires_verification": False,
        "is_self_declared": True,
    },
    {
        "title": "Participe de um treinamento",
        "description": "Assista a um treinamento online ou presencial sobre as propostas da campanha.",
        "category_slug": "formacao",
        "action_type": "TRAINING",
        "recurrence": "ONE_TIME",
        "points_reward": 40,
        "required_count": 1,
        "is_featured": False,
        "requires_verification": True,
        "verification_type": "admin_approval",
        "is_self_declared": False,
    },
    {
        "title": "Organize um encontro comunitário",
        "description": "Organize um encontro na sua comunidade para discutir as propostas da campanha. Envie fotos como comprovação.",
        "category_slug": "comunidade",
        "action_type": "ORGANIZE_MEETUP",
        "recurrence": "ONE_TIME",
        "points_reward": 100,
        "required_count": 1,
        "is_featured": True,
        "requires_verification": True,
        "verification_type": "photo",
        "is_self_declared": False,
    },
    {
        "title": "Colete demandas da população",
        "description": "Converse com pessoas da sua comunidade e registre suas demandas e sugestões.",
        "category_slug": "comunidade",
        "action_type": "COLLECT_DEMAND",
        "recurrence": "ONE_TIME",
        "points_reward": 20,
        "required_count": 5,
        "is_featured": False,
        "requires_verification": True,
        "verification_type": "admin_approval",
        "is_self_declared": False,
    },
    {
        "title": "Divulgue uma proposta",
        "description": "Escolha uma proposta da campanha e divulgue para pelo menos 10 pessoas.",
        "category_slug": "mobilizacao",
        "action_type": "SPREAD_PROPOSAL",
        "recurrence": "WEEKLY",
        "points_reward": 15,
        "required_count": 1,
        "is_featured": False,
        "requires_verification": False,
        "is_self_declared": True,
    },
]


# ═══════════════════════════════════════════════════════════════
#  SEED FUNCTIONS
# ═══════════════════════════════════════════════════════════════

async def seed_table(db: AsyncSession, table: str, slug_field: str, items: list[dict], extra_cols: str = "") -> dict[str, uuid.UUID]:
    """Generic upsert-by-slug seeder. Returns {slug: id} mapping."""
    ids = {}
    created = 0
    skipped = 0

    for item in items:
        slug = item[slug_field]
        existing = await db.execute(
            text(f"SELECT id FROM {table} WHERE {slug_field} = :slug"),
            {"slug": slug},
        )
        row = existing.first()
        if row:
            ids[slug] = row[0]
            skipped += 1
        else:
            item_id = uuid.uuid4()
            ids[slug] = item_id
            cols = list(item.keys())
            cols.insert(0, "id")
            vals = {**item, "id": item_id}

            col_names = ", ".join(cols) + ", created_at, updated_at"
            col_params = ", ".join(f":{c}" for c in cols) + ", NOW(), NOW()"

            await db.execute(text(f"INSERT INTO {table} ({col_names}) VALUES ({col_params})"), vals)
            created += 1

    await db.commit()
    return ids, created, skipped


async def seed_badges(db: AsyncSession, badges: list[dict]) -> tuple[int, int]:
    """Seed badges (keyed by name, not slug)."""
    created = 0
    skipped = 0

    for badge in badges:
        existing = await db.execute(
            text("SELECT id FROM badges WHERE name = :name"),
            {"name": badge["name"]},
        )
        if existing.first():
            skipped += 1
            continue

        badge_id = uuid.uuid4()
        await db.execute(
            text("""
                INSERT INTO badges (id, name, description, icon_url, category, rarity, criteria_type, criteria_value, is_active, created_at, updated_at)
                VALUES (:id, :name, :description, NULL, :category, :rarity, :criteria_type, :criteria_value, true, NOW(), NOW())
            """),
            {"id": badge_id, **badge},
        )
        created += 1

    await db.commit()
    return created, skipped


async def seed_missions(db: AsyncSession, missions: list[dict], cat_ids: dict[str, uuid.UUID]) -> tuple[int, int]:
    """Seed missions (keyed by title)."""
    created = 0
    skipped = 0

    for m in missions:
        existing = await db.execute(
            text("SELECT id FROM missions WHERE title = :title"),
            {"title": m["title"]},
        )
        if existing.first():
            skipped += 1
            continue

        mission_id = uuid.uuid4()
        category_slug = m.pop("category_slug")
        verification_type = m.pop("verification_type", None)
        max_daily_completions = m.pop("max_daily_completions", 0)

        await db.execute(
            text("""
                INSERT INTO missions (
                    id, title, description, category_id, recurrence, action_type,
                    points_reward, xp_reward, required_count, requires_verification,
                    verification_type, is_featured, is_self_declared,
                    max_daily_completions, max_submissions, metadata,
                    created_at, updated_at
                ) VALUES (
                    :id, :title, :description, :category_id, :recurrence, :action_type,
                    :points_reward, 0, :required_count, :requires_verification,
                    :verification_type, :is_featured, :is_self_declared,
                    :max_daily_completions, 3, '{}',
                    NOW(), NOW()
                )
            """),
            {
                "id": mission_id,
                "title": m["title"],
                "description": m["description"],
                "category_id": cat_ids.get(category_slug),
                "recurrence": m["recurrence"],
                "action_type": m["action_type"],
                "points_reward": m["points_reward"],
                "required_count": m["required_count"],
                "requires_verification": m["requires_verification"],
                "verification_type": verification_type,
                "is_featured": m["is_featured"],
                "is_self_declared": m["is_self_declared"],
                "max_daily_completions": max_daily_completions,
            },
        )
        created += 1

    await db.commit()
    return created, skipped


# ═══════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════

async def seed_all():
    async with AsyncSessionLocal() as db:
        print("═══════════════════════════════════════════════════════")
        print("  🌱 Seed All — Populando banco com dados base")
        print("═══════════════════════════════════════════════════════\n")

        # 1. Levels
        print("📊 Levels...")
        level_ids, c, s = await seed_table(db, "levels", "slug", LEVELS)
        print(f"   ✅ {c} criados, {s} já existiam\n")

        # 2. Regions
        print("🗺️  Regions...")
        region_ids, c, s = await seed_table(db, "regions", "slug", REGIONS)
        print(f"   ✅ {c} criados, {s} já existiam\n")

        # 3. Mission Categories
        print("📂 Mission Categories...")
        cat_ids, c, s = await seed_table(db, "mission_categories", "slug", MISSION_CATEGORIES)
        print(f"   ✅ {c} criados, {s} já existiam\n")

        # 4. Badges
        print("🏅 Badges...")
        c, s = await seed_badges(db, BADGES)
        print(f"   ✅ {c} criados, {s} já existiam\n")

        # 5. Missions
        print("🎯 Missions...")
        # Deep copy to avoid mutating the original data
        import copy
        missions_copy = copy.deepcopy(MISSIONS)
        c, s = await seed_missions(db, missions_copy, cat_ids)
        print(f"   ✅ {c} criados, {s} já existiam\n")

        # 6. Point Configs
        print("⚙️  Point Configs...")
        point_configs = [
            {"key": "registration", "points": 5, "label": "Bônus de cadastro", "description": "Pontos concedidos ao novo usuário ao se cadastrar", "category": "auth"},
            {"key": "referral_bonus", "points": 10, "label": "Bônus de indicação", "description": "Pontos concedidos a quem indicou quando alguém usa seu código", "category": "auth"},
            {"key": "invite_accepted", "points": 30, "label": "Convite aceito", "description": "Pontos concedidos a quem convidou quando o convite é aceito", "category": "invitations"},
            {"key": "invite_validated", "points": 30, "label": "Convite validado", "description": "Pontos concedidos a quem convidou quando o convidado completa a 1ª missão", "category": "missions"},
            {"key": "event_landing_click", "points": 10, "label": "Clique em página de evento", "description": "Pontos concedidos ao referrer quando alguém clica na página do evento", "category": "events"},
            {"key": "material_landing_click", "points": 10, "label": "Clique em página de material", "description": "Pontos concedidos ao referrer quando alguém clica na página do material", "category": "content"},
            {"key": "event_share", "points": 10, "label": "Compartilhamento de evento", "description": "Pontos concedidos ao embaixador ao compartilhar um evento", "category": "events"},
        ]
        pc_created = 0
        pc_skipped = 0
        for pc in point_configs:
            existing = await db.execute(
                text("SELECT id FROM point_configs WHERE key = :key"),
                {"key": pc["key"]},
            )
            if existing.first():
                pc_skipped += 1
            else:
                pc_id = uuid.uuid4()
                await db.execute(
                    text("""
                        INSERT INTO point_configs (id, key, points, label, description, category, is_active, created_at, updated_at)
                        VALUES (:id, :key, :points, :label, :description, :category, true, NOW(), NOW())
                    """),
                    {"id": pc_id, **pc},
                )
                pc_created += 1
        await db.commit()
        print(f"   ✅ {pc_created} criados, {pc_skipped} já existiam\n")

        # Summary
        result = await db.execute(text("""
            SELECT 'levels' as t, count(*) FROM levels
            UNION ALL SELECT 'regions', count(*) FROM regions
            UNION ALL SELECT 'mission_categories', count(*) FROM mission_categories
            UNION ALL SELECT 'badges', count(*) FROM badges
            UNION ALL SELECT 'missions', count(*) FROM missions
            UNION ALL SELECT 'point_configs', count(*) FROM point_configs
            ORDER BY t
        """))
        print("═══════════════════════════════════════════════════════")
        print("  ✅ Seed concluído! Totais no banco:")
        print("═══════════════════════════════════════════════════════")
        for row in result:
            print(f"   {row[0]:25s} {row[1]:>5d}")
        print()


if __name__ == "__main__":
    asyncio.run(seed_all())


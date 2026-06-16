"""
═══════════════════════════════════════════════════════════════
  Seed Script — Missões de teste com vários tipos e status
  Roda diretamente contra o banco via SQLAlchemy
═══════════════════════════════════════════════════════════════

Usage:
  cd backend
  python -m scripts.seed_missions
"""

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add backend/src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# ═══ DATABASE SETUP ═══
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("❌ DATABASE_URL não definida. Configure no .env ou como variável de ambiente.")
    sys.exit(1)

# Convert to async
ASYNC_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
if ASYNC_URL.startswith("postgres://"):
    ASYNC_URL = ASYNC_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# Detect external connection pooler (PgBouncer/Supavisor)
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


async def seed():
    async with AsyncSessionLocal() as db:
        print("🔗 Conectando ao banco...")

        # ═══ 1. FIND OR CREATE USER ═══
        result = await db.execute(text("SELECT id, full_name FROM profiles LIMIT 1"))
        user_row = result.first()

        if not user_row:
            print("❌ Nenhum usuário encontrado no banco. Crie uma conta no app primeiro.")
            return

        user_id = user_row[0]
        user_name = user_row[1]
        print(f"👤 Usando usuário: {user_name} ({user_id})")

        # ═══ 2. CREATE CATEGORIES ═══
        print("\n📂 Criando categorias de missão...")

        categories = [
            {"name": "Eventos", "slug": "eventos", "icon": "🎤", "color": "#4DA3FF", "order_index": 1},
            {"name": "Redes Sociais", "slug": "redes-sociais", "icon": "📱", "color": "#E33431", "order_index": 2},
            {"name": "Mobilização", "slug": "mobilizacao", "icon": "🚀", "color": "#4DAA35", "order_index": 3},
            {"name": "Formação", "slug": "formacao", "icon": "📚", "color": "#FAD549", "order_index": 4},
            {"name": "Comunidade", "slug": "comunidade", "icon": "🤝", "color": "#7A3F8F", "order_index": 5},
        ]

        cat_ids = {}
        for cat in categories:
            # Check if already exists
            existing = await db.execute(
                text("SELECT id FROM mission_categories WHERE slug = :slug"),
                {"slug": cat["slug"]},
            )
            row = existing.first()
            if row:
                cat_ids[cat["slug"]] = row[0]
                print(f"  ✓ Categoria '{cat['name']}' já existe")
            else:
                cat_id = uuid.uuid4()
                cat_ids[cat["slug"]] = cat_id
                await db.execute(
                    text("""
                        INSERT INTO mission_categories (id, name, slug, icon, color, order_index, created_at, updated_at)
                        VALUES (:id, :name, :slug, :icon, :color, :order_index, NOW(), NOW())
                    """),
                    {**cat, "id": cat_id},
                )
                print(f"  ✅ Categoria '{cat['name']}' criada")

        await db.commit()

        # ═══ 3. CREATE MISSIONS (various types) ═══
        print("\n🎯 Criando missões...")

        now = datetime.now(timezone.utc)
        missions = [
            # ─── DISPONÍVEIS (sem UserMission, o user ainda não iniciou) ───
            {
                "title": "Participar de um Evento Presencial",
                "description": "Compareça a um evento da campanha e faça check-in no local. Sua presença fortalece nossa rede!",
                "action_type": "EVENT_ATTENDANCE",
                "category_slug": "eventos",
                "points_reward": 100,
                "required_count": 1,
                "recurrence": "PER_EVENT",
                "is_featured": True,
                "requires_verification": False,
                "is_self_declared": False,
                "status": None,  # DISPONÍVEL — sem user_mission
            },
            {
                "title": "Compartilhar Conteúdo no WhatsApp",
                "description": "Compartilhe materiais oficiais da campanha no WhatsApp para ampliar nosso alcance. Cada compartilhamento conta!",
                "action_type": "CONTENT_SHARE",
                "category_slug": "redes-sociais",
                "points_reward": 30,
                "required_count": 5,
                "recurrence": "DAILY",
                "is_featured": False,
                "requires_verification": False,
                "is_self_declared": True,
                "max_daily_completions": 3,
                "status": None,
            },
            {
                "title": "Convidar 3 Amigos para a Rede",
                "description": "Convide amigos para se cadastrarem na Rede de Embaixadores. Quando eles verificarem a conta, você ganha pontos!",
                "action_type": "INVITE",
                "category_slug": "comunidade",
                "points_reward": 150,
                "required_count": 3,
                "recurrence": "ONE_TIME",
                "is_featured": True,
                "requires_verification": False,
                "is_self_declared": False,
                "status": None,
            },
            {
                "title": "Completar Módulo de Formação",
                "description": "Assista ao vídeo de formação política e responda o quiz. Embaixadores informados fazem a diferença!",
                "action_type": "TRAINING",
                "category_slug": "formacao",
                "points_reward": 80,
                "required_count": 1,
                "recurrence": "ONE_TIME",
                "is_featured": False,
                "requires_verification": True,
                "verification_type": "admin_approval",
                "is_self_declared": False,
                "status": None,
            },

            # ─── EM ANDAMENTO (in_progress) ───
            {
                "title": "Organizar um Meetup Local",
                "description": "Organize uma reunião com pelo menos 10 pessoas da sua comunidade para discutir propostas da campanha. Envie fotos como evidência.",
                "action_type": "ORGANIZE_MEETUP",
                "category_slug": "mobilizacao",
                "points_reward": 300,
                "required_count": 1,
                "recurrence": "ONE_TIME",
                "is_featured": True,
                "requires_verification": True,
                "verification_type": "photo",
                "is_self_declared": False,
                "status": "in_progress",
                "progress_count": 0,
            },
            {
                "title": "Divulgar Propostas na Vizinhança",
                "description": "Converse com 20 vizinhos sobre as propostas da campanha. Registre cada conversa no app para acompanhar seu progresso.",
                "action_type": "SPREAD_PROPOSAL",
                "category_slug": "mobilizacao",
                "points_reward": 200,
                "required_count": 20,
                "recurrence": "WEEKLY",
                "is_featured": False,
                "requires_verification": False,
                "is_self_declared": True,
                "status": "in_progress",
                "progress_count": 8,
            },
            {
                "title": "Participar de 3 Eventos Online",
                "description": "Assista a lives e webinários oficiais da campanha. Cada participação com check-in conta como progresso.",
                "action_type": "EVENT_ATTENDANCE",
                "category_slug": "eventos",
                "points_reward": 120,
                "required_count": 3,
                "recurrence": "ONE_TIME",
                "is_featured": False,
                "requires_verification": False,
                "is_self_declared": False,
                "status": "in_progress",
                "progress_count": 1,
            },

            # ─── ENVIADA (pending_verification — aguardando verificação) ───
            {
                "title": "Coletar Demandas da Comunidade",
                "description": "Visite 5 locais da sua comunidade e registre as demandas dos moradores. Envie o relatório como evidência.",
                "action_type": "COLLECT_DEMAND",
                "category_slug": "comunidade",
                "points_reward": 250,
                "required_count": 5,
                "recurrence": "ONE_TIME",
                "is_featured": False,
                "requires_verification": True,
                "verification_type": "admin_approval",
                "is_self_declared": False,
                "status": "pending_verification",
                "progress_count": 5,
                "evidence_url": "https://docs.google.com/document/d/example",
            },

            # ─── CONCLUÍDAS (completed) ───
            {
                "title": "Primeiro Check-in em Evento",
                "description": "Faça seu primeiro check-in em qualquer evento da campanha. Missão introdutória para novos embaixadores!",
                "action_type": "EVENT_ATTENDANCE",
                "category_slug": "eventos",
                "points_reward": 50,
                "required_count": 1,
                "recurrence": "ONE_TIME",
                "is_featured": False,
                "requires_verification": False,
                "is_self_declared": True,
                "status": "completed",
                "progress_count": 1,
                "points_awarded": 50,
            },
            {
                "title": "Compartilhar 10 Posts nas Redes",
                "description": "Compartilhe conteúdos oficiais em qualquer rede social. Ajude a ampliar nossa mensagem!",
                "action_type": "CONTENT_SHARE",
                "category_slug": "redes-sociais",
                "points_reward": 60,
                "required_count": 10,
                "recurrence": "ONE_TIME",
                "is_featured": False,
                "requires_verification": False,
                "is_self_declared": True,
                "status": "completed",
                "progress_count": 10,
                "points_awarded": 60,
            },
            {
                "title": "Completar Onboarding de Embaixador",
                "description": "Complete todos os passos do tutorial inicial e configure seu perfil completo.",
                "action_type": "TRAINING",
                "category_slug": "formacao",
                "points_reward": 25,
                "required_count": 1,
                "recurrence": "ONE_TIME",
                "is_featured": False,
                "requires_verification": False,
                "is_self_declared": True,
                "status": "completed",
                "progress_count": 1,
                "points_awarded": 25,
            },

            # ─── REJEITADA (in_progress com rejected_reason — pode re-submeter) ───
            {
                "title": "Registrar Ação Comunitária",
                "description": "Organize ou participe de uma ação social na sua comunidade (mutirão, arrecadação, etc). Envie fotos e relatório.",
                "action_type": "ORGANIZE_MEETUP",
                "category_slug": "comunidade",
                "points_reward": 400,
                "required_count": 1,
                "recurrence": "ONE_TIME",
                "is_featured": True,
                "requires_verification": True,
                "verification_type": "photo",
                "is_self_declared": False,
                "status": "in_progress",
                "progress_count": 1,
                "rejected_reason": "A foto enviada não mostra a ação claramente. Por favor, envie fotos do evento com participantes visíveis.",
            },
        ]

        for m in missions:
            mission_id = uuid.uuid4()
            status = m.pop("status", None)
            progress_count = m.pop("progress_count", 0)
            points_awarded = m.pop("points_awarded", 0)
            evidence_url = m.pop("evidence_url", None)
            rejected_reason = m.pop("rejected_reason", None)
            category_slug = m.pop("category_slug")
            verification_type = m.pop("verification_type", None)
            max_daily_completions = m.pop("max_daily_completions", 0)

            # Check if mission already exists by title
            existing = await db.execute(
                text("SELECT id FROM missions WHERE title = :title"),
                {"title": m["title"]},
            )
            if existing.first():
                print(f"  ⏭ Missão '{m['title'][:40]}...' já existe, pulando")
                continue

            # Insert mission
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

            status_emoji = {
                None: "🟢 DISPONÍVEL",
                "in_progress": "🟡 EM ANDAMENTO",
                "pending_verification": "🔵 ENVIADA",
                "completed": "✅ CONCLUÍDA",
            }
            print(f"  {status_emoji.get(status, '❓')} '{m['title'][:50]}'  (+{m['points_reward']}pts)")

            # Create UserMission if status is set (not available)
            if status:
                um_id = uuid.uuid4()
                await db.execute(
                    text("""
                        INSERT INTO user_missions (
                            id, user_id, mission_id, progress_count, status,
                            evidence_url, notes, submission_count,
                            started_at, submitted_at, completed_at, rejected_reason,
                            points_awarded
                        ) VALUES (
                            :id, :user_id, :mission_id, :progress_count, :status,
                            :evidence_url, NULL, :submission_count,
                            :started_at, :submitted_at, :completed_at, :rejected_reason,
                            :points_awarded
                        )
                    """),
                    {
                        "id": um_id,
                        "user_id": user_id,
                        "mission_id": mission_id,
                        "progress_count": progress_count,
                        "status": status,
                        "evidence_url": evidence_url,
                        "submission_count": 1 if status in ("pending_verification", "completed") else 0,
                        "started_at": now,
                        "submitted_at": now if status in ("pending_verification", "completed") else None,
                        "completed_at": now if status == "completed" else None,
                        "rejected_reason": rejected_reason,
                        "points_awarded": points_awarded,
                    },
                )

        await db.commit()
        print("\n═══════════════════════════════════════════════════════")
        print("✅ Seed concluído!")
        print("═══════════════════════════════════════════════════════")
        print(f"\n📊 Resumo:")
        print(f"  • 4 missões DISPONÍVEIS (vários tipos)")
        print(f"  • 3 missões EM ANDAMENTO (progresso parcial)")
        print(f"  • 1 missão ENVIADA (aguardando verificação)")
        print(f"  • 3 missões CONCLUÍDAS")
        print(f"  • 1 missão REJEITADA (in_progress com rejected_reason)")
        print(f"  • 5 categorias criadas")
        print(f"\n🔄 Reinicie o app para ver as mudanças!")


if __name__ == "__main__":
    asyncio.run(seed())

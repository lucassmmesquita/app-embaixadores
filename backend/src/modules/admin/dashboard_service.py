"""
═══════════════════════════════════════════════════════════════
  Admin Module — Dashboard Service V2 (Engajamento)
  PRD §4 (Dashboard Analítico)
═══════════════════════════════════════════════════════════════
"""

import math
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

# Meta configurada (pode vir de campaign_settings depois)
ACTIVATION_TARGET = 0.60


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_date_filters(self, period_str: str) -> tuple[datetime | None, datetime]:
        now = datetime.now(timezone.utc)
        if period_str == "7d":
            return now - timedelta(days=7), now
        elif period_str == "30d":
            return now - timedelta(days=30), now
        elif period_str == "90d":
            return now - timedelta(days=90), now
        return None, now  # Todo o período

    async def get_dashboard(self, period: str = "30d") -> dict:
        start_date, end_date = self._get_date_filters(period)
        
        # Filtro opcional de data para as queries (quando aplicável)
        date_filter = "AND created_at >= :start_date" if start_date else ""
        params = {"start_date": start_date} if start_date else {}

        # Executando queries principais em paralelo não é estritamente necessário aqui, 
        # mas faremos sequencialmente para clareza e porque o volume é pequeno
        
        # 1. Total de usuários e cadastros recentes
        query_users = """
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN {cond} THEN 1 ELSE 0 END) as new_in_period
            FROM profiles 
            WHERE is_active = true
        """
        if start_date:
            users_result = await self.db.execute(text(query_users.format(cond="created_at >= :start_date")), {"start_date": start_date})
        else:
            users_result = await self.db.execute(text(query_users.format(cond="1=1")))
        users_data = users_result.fetchone()
        
        # 2. Taxa de Ativação (1ª missão em <= 48h)
        # Quantos usuários criados no período completaram pelo menos uma missão em 48h
        activation_result = await self.db.execute(text(f"""
            WITH new_users AS (
                SELECT id, created_at 
                FROM profiles 
                WHERE is_active = true {date_filter}
            ),
            activated AS (
                SELECT u.id
                FROM new_users u
                JOIN user_missions um ON um.user_id = u.id
                WHERE um.status = 'completed' 
                AND um.completed_at <= (u.created_at + INTERVAL '48 hours')
                GROUP BY u.id
            )
            SELECT 
                (SELECT COUNT(*) FROM new_users) as total_new,
                (SELECT COUNT(*) FROM activated) as activated_count
        """), params)
        act_data = activation_result.fetchone()
        
        total_new = act_data.total_new or 0
        activated_count = act_data.activated_count or 0
        activation_rate = (activated_count / total_new) if total_new > 0 else 0
        
        # 3. Coeficiente Viral
        # Média de convites validados por usuário que já enviou pelo menos um convite
        viral_result = await self.db.execute(text(f"""
            SELECT 
                COUNT(DISTINCT inviter_id) as inviters,
                COUNT(*) FILTER (WHERE status = 'verified') as validated_invites
            FROM invitations
            WHERE 1=1 {date_filter}
        """), params)
        viral_data = viral_result.fetchone()
        inviters = viral_data.inviters or 0
        validated = viral_data.validated_invites or 0
        viral_coef = (validated / inviters) if inviters > 0 else 0
        
        # 4. Distribuição de Pontos
        points_dist_result = await self.db.execute(text(f"""
            SELECT source_type, SUM(points) as total_points
            FROM point_transactions
            WHERE points > 0 {date_filter}
            GROUP BY source_type
        """), params)
        
        points_distribution = {
            "mission": 0,
            "event": 0,
            "material": 0,
            "invitation": 0,
            "registration": 0,
            "other": 0
        }
        total_points_period = 0
        for row in points_dist_result.fetchall():
            pts = int(row.total_points)
            total_points_period += pts
            
            stype = row.source_type
            if stype == "mission":
                points_distribution["mission"] += pts
            elif stype in ["event", "event_share", "event_click"]:
                points_distribution["event"] += pts
            elif stype in ["content_share", "material_click"]:
                points_distribution["material"] += pts
            elif stype == "invitation":
                points_distribution["invitation"] += pts
            elif stype == "registration":
                points_distribution["registration"] += pts
            else:
                points_distribution["other"] += pts
                
        # Remove categories with zero points
        points_distribution = {k: v for k, v in points_distribution.items() if v > 0}

        # 5. Trend: Cadastros por período
        signups_trend = []
        if period == "7d" or period == "30d":
            trend_days = 7 if period == "7d" else 30
            trend_start = datetime.now(timezone.utc) - timedelta(days=trend_days - 1)
            trend_result = await self.db.execute(text("""
                SELECT DATE(created_at) as day, COUNT(*) as count
                FROM profiles 
                WHERE is_active = true AND created_at >= :trend_start
                GROUP BY DATE(created_at)
                ORDER BY day ASC
            """), {"trend_start": trend_start})
            trend_dict = {row.day.isoformat(): row.count for row in trend_result.fetchall()}
            for i in range(trend_days):
                d = (trend_start + timedelta(days=i)).date()
                label = f"{d.day:02d}/{d.month:02d}"
                signups_trend.append({"label": label, "value": trend_dict.get(d.isoformat(), 0)})
        elif period == "90d":
            trend_weeks = 13
            trend_start = datetime.now(timezone.utc) - timedelta(weeks=trend_weeks)
            trend_result = await self.db.execute(text("""
                SELECT DATE_TRUNC('week', created_at) as week_start, COUNT(*) as count
                FROM profiles 
                WHERE is_active = true AND created_at >= :trend_start
                GROUP BY DATE_TRUNC('week', created_at)
                ORDER BY week_start ASC
            """), {"trend_start": trend_start})
            trend_dict = {row.week_start.date().isoformat(): row.count for row in trend_result.fetchall()}
            current_week = (trend_start - timedelta(days=trend_start.weekday())).date()
            for i in range(trend_weeks):
                w_start = current_week + timedelta(weeks=i)
                w_end = w_start + timedelta(days=6)
                label = f"{w_start.day:02d}/{w_start.month:02d}"
                signups_trend.append({"label": label, "value": trend_dict.get(w_start.isoformat(), 0)})
        else: # "1y" or "all"
            trend_months = 12
            def add_months(d, months):
                month = d.month - 1 + months
                year = d.year + month // 12
                month = month % 12 + 1
                return d.replace(year=year, month=month, day=1)
            
            trend_start = add_months(datetime.now(timezone.utc), -(trend_months - 1)).replace(hour=0, minute=0, second=0)
            trend_result = await self.db.execute(text("""
                SELECT DATE_TRUNC('month', created_at) as month_start, COUNT(*) as count
                FROM profiles 
                WHERE is_active = true AND created_at >= :trend_start
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month_start ASC
            """), {"trend_start": trend_start})
            trend_dict = {row.month_start.date().isoformat(): row.count for row in trend_result.fetchall()}
            meses_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
            for i in range(trend_months):
                m_start = add_months(trend_start, i).date()
                label = f"{meses_pt[m_start.month - 1]}/{str(m_start.year)[2:]}"
                signups_trend.append({"label": label, "value": trend_dict.get(m_start.isoformat(), 0)})

        # 6. Providers (auth.identities)
        providers = []
        try:
            async with self.db.begin_nested():
                prov_result = await self.db.execute(text("""
                    SELECT provider, COUNT(DISTINCT user_id) as count
                    FROM auth.identities
                    GROUP BY provider
                    ORDER BY count DESC
                """))
                for row in prov_result.fetchall():
                    providers.append({"name": row.provider.capitalize(), "count": row.count})
        except Exception:
            # Em dev se não tiver auth scheme ou permissão falha gracioso
            pass
            
        # 7. Funil de níveis
        funnel_result = await self.db.execute(text("""
            SELECT l.name, COUNT(p.id) as count, l.order_index, l.color
            FROM levels l
            LEFT JOIN profiles p ON p.current_level_id = l.id AND p.is_active = true
            GROUP BY l.id, l.name, l.order_index, l.color
            ORDER BY l.order_index ASC
        """))
        funnel = [{"name": row.name, "count": row.count, "color": row.color} for row in funnel_result.fetchall()]

        # 8. Onboarding incompleto
        onboarding_result = await self.db.execute(text(f"""
            SELECT COUNT(*) as incomplete, (SELECT COUNT(*) FROM profiles WHERE is_active = true {date_filter}) as total
            FROM profiles 
            WHERE is_active = true AND onboarding_completed = false {date_filter}
        """), params)
        onb_data = onboarding_result.fetchone()
        incomplete_rate = (onb_data.incomplete / onb_data.total) if onb_data.total and onb_data.total > 0 else 0

        # 9. Operacional: Missões (Analytics)
        um_date_filter = "AND started_at >= :start_date" if start_date else ""
        
        # Adoção
        adoption_result = await self.db.execute(text(f"""
            SELECT 
                COUNT(DISTINCT um.user_id) as users_started,
                COUNT(DISTINCT CASE WHEN um.status = 'completed' THEN um.user_id END) as users_completed,
                (SELECT COUNT(*) FROM profiles WHERE is_active = true) as total_active_users
            FROM user_missions um
            WHERE 1=1 {um_date_filter}
        """), params)
        adoption_data = adoption_result.fetchone()
        
        # Funil (Baseado no volume de missões, não em usuários únicos, para mostrar o backlog real)
        funnel_result = await self.db.execute(text(f"""
            SELECT 
                COUNT(*) as started,
                COUNT(*) FILTER (WHERE status IN ('submitted', 'completed', 'rejected')) as submitted,
                COUNT(*) FILTER (WHERE status = 'completed') as completed
            FROM user_missions
            WHERE 1=1 {um_date_filter}
        """), params)
        missions_funnel = dict(funnel_result.mappings().fetchone())
        
        # Top 5
        top5_result = await self.db.execute(text(f"""
            SELECT m.title, COUNT(um.id) as completions
            FROM user_missions um
            JOIN missions m ON m.id = um.mission_id
            WHERE um.status = 'completed' {um_date_filter}
            GROUP BY m.id, m.title
            ORDER BY completions DESC
            LIMIT 5
        """), params)
        missions_top5 = [{"title": row.title, "completions": row.completions} for row in top5_result.fetchall()]

        missions_analytics = {
            "adoption": {
                "users_started": adoption_data.users_started or 0,
                "users_completed": adoption_data.users_completed or 0,
                "total_active": adoption_data.total_active_users or 0
            },
            "funnel": missions_funnel,
            "top_5": missions_top5
        }

        # 10. Operacional: Eventos Analytics
        events_funnel_result = await self.db.execute(text(f"""
            WITH e AS (
                SELECT id FROM events WHERE is_active = true {date_filter}
            )
            SELECT 
                (SELECT COUNT(*) FROM e) as scheduled,
                (SELECT COUNT(*) FROM event_participants WHERE event_id IN (SELECT id FROM e)) as registered,
                (SELECT COUNT(DISTINCT user_id) FROM event_participants WHERE event_id IN (SELECT id FROM e)) as unique_registered,
                (SELECT COUNT(*) FROM event_participants WHERE event_id IN (SELECT id FROM e) AND check_in_at IS NOT NULL) as checkins
        """), params)
        ev_funnel = dict(events_funnel_result.mappings().fetchone())
        
        events_top5_result = await self.db.execute(text(f"""
            SELECT e.title, COUNT(ep.id) as checkins
            FROM events e
            JOIN event_participants ep ON ep.event_id = e.id
            WHERE e.is_active = true AND ep.check_in_at IS NOT NULL {date_filter}
            GROUP BY e.id, e.title
            ORDER BY checkins DESC
            LIMIT 5
        """), params)
        events_top5 = [{"title": row.title, "completions": row.checkins} for row in events_top5_result.fetchall()]

        events_analytics = {
            "funnel": ev_funnel,
            "top_5": events_top5
        }
        
        checkin_rate = (ev_funnel["checkins"] / ev_funnel["registered"]) if ev_funnel["registered"] > 0 else None

        # 11. Operacional: Materiais Analytics
        materials_funnel_result = await self.db.execute(text(f"""
            WITH c AS (
                SELECT id FROM content WHERE is_active = true {date_filter}
            )
            SELECT 
                (SELECT COUNT(*) FROM c) as active,
                (SELECT COUNT(*) FROM content_shares WHERE content_id IN (SELECT id FROM c)) as shares,
                (SELECT COUNT(*) FROM material_clicks WHERE content_id IN (SELECT id FROM c)) as clicks
        """), params)
        mat_funnel = dict(materials_funnel_result.mappings().fetchone())

        materials_top5_result = await self.db.execute(text(f"""
            SELECT c.title, 
                   (SELECT COUNT(*) FROM content_shares cs WHERE cs.content_id = c.id) + 
                   (SELECT COUNT(*) FROM material_clicks mc WHERE mc.content_id = c.id) as score
            FROM content c
            WHERE c.is_active = true {date_filter}
            ORDER BY score DESC
            LIMIT 5
        """), params)
        materials_top5 = [{"title": row.title, "completions": row.score} for row in materials_top5_result.fetchall()]

        materials_analytics = {
            "funnel": mat_funnel,
            "top_5": materials_top5
        }

        # --- TERMÔMETRO (Insight) ---
        insight = {"status": "success", "title": "Engajamento saudável!", "message": f"A ativação superou a meta ({int(ACTIVATION_TARGET*100)}%) e o funil de níveis está operando normalmente."}
        
        # Regra 2: Ativação (Passa a ser a prioridade 1)
        if activation_rate < ACTIVATION_TARGET and total_new > 10:
             insight = {
                "status": "warning",
                "title": "Ativação abaixo da meta",
                "message": f"Apenas {int(activation_rate*100)}% dos novos cadastros concluem a 1ª missão (meta: {int(ACTIVATION_TARGET*100)}%)."
            }
        # Regra 3: Funil
        elif len(funnel) >= 2 and funnel[0]['count'] > 10:
            conv = funnel[1]['count'] / funnel[0]['count']
            if conv < 0.30:
                 insight = {
                    "status": "warning",
                    "title": "Atenção na Progressão",
                    "message": f"A conversão do nível inicial para o próximo está muito baixa ({int(conv*100)}%)."
                }
        # Regra 4: Eventos
        elif checkin_rate is not None and checkin_rate < 0.50 and ev_funnel["registered"] > 10:
             insight = {
                "status": "warning",
                "title": "Evasão em Eventos",
                "message": f"Em média, apenas {int(checkin_rate*100)}% dos inscritos estão comparecendo aos eventos recentes."
            }

        return {
            "insight": insight,
            "kpis": {
                "total_users": users_data.total,
                "new_users_period": users_data.new_in_period or 0,
                "activation_rate": activation_rate,
                "viral_coef": viral_coef,
                "total_points_period": total_points_period,
                "points_distribution": points_distribution
            },
            "funnel": funnel,
            "providers": providers,
            "missions_analytics": missions_analytics,
            "events_analytics": events_analytics,
            "materials_analytics": materials_analytics,
            "trend": signups_trend
        }

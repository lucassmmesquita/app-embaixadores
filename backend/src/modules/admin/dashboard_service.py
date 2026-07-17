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
        users_result = await self.db.execute(text(f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN created_at >= :week_ago THEN 1 ELSE 0 END) as new_this_week
            FROM profiles 
            WHERE is_active = true
        """), {"week_ago": datetime.now(timezone.utc) - timedelta(days=7)})
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
                COUNT(*) FILTER (WHERE status = 'validated') as validated_invites
            FROM invitations
        """))
        viral_data = viral_result.fetchone()
        inviters = viral_data.inviters or 0
        validated = viral_data.validated_invites or 0
        viral_coef = (validated / inviters) if inviters > 0 else 0
        
        # 4. Média de pontos
        points_result = await self.db.execute(text("""
            SELECT COALESCE(AVG(total_points), 0) as avg_points
            FROM profiles WHERE is_active = true
        """))
        avg_points = points_result.fetchone().avg_points

        # 5. Trend: Cadastros por dia (últimos 14 dias se período <= 30d, senão mais)
        trend_days = 14 if period in ("7d", "30d") else 30
        trend_start = datetime.now(timezone.utc) - timedelta(days=trend_days)
        trend_result = await self.db.execute(text("""
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM profiles 
            WHERE is_active = true AND created_at >= :trend_start
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        """), {"trend_start": trend_start})
        
        trend_dict = {row.day.isoformat(): row.count for row in trend_result.fetchall()}
        # Fill missing days
        signups_trend = []
        for i in range(trend_days):
            d = (trend_start + timedelta(days=i)).date().isoformat()
            signups_trend.append(trend_dict.get(d, 0))

        # 6. Providers (auth.identities)
        providers = []
        try:
            async with self.db.begin_nested():
                prov_result = await self.db.execute(text("""
                    SELECT provider, COUNT(DISTINCT user_id) as count
                    FROM auth.identities
                    GROUP BY provider
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

        # 9. Operacional: Missões
        um_date_filter = "AND started_at >= :start_date" if start_date else ""
        missions_result = await self.db.execute(text(f"""
            SELECT status, COUNT(*) as count
            FROM user_missions
            WHERE 1=1 {um_date_filter}
            GROUP BY status
        """), params)
        missions_dist = {row.status: row.count for row in missions_result.fetchall()}

        # 10. Operacional: Eventos
        events_result = await self.db.execute(text(f"""
            SELECT 
                CASE 
                    WHEN start_datetime > NOW() THEN 'agendado'
                    WHEN start_datetime <= NOW() AND (end_datetime IS NULL OR end_datetime >= NOW()) THEN 'andamento'
                    ELSE 'finalizado'
                END as status,
                COUNT(*) as count
            FROM events
            WHERE is_active = true {date_filter}
            GROUP BY 1
        """), params)
        events_dist = {row.status: row.count for row in events_result.fetchall()}

        # 11. Operacional: Compartilhamentos
        materials_result = await self.db.execute(text("""
            SELECT 
                (SELECT COUNT(*) FROM content WHERE is_active = true) as total_content,
                (SELECT COUNT(DISTINCT content_id) FROM content_shares) as shared_content
        """))
        mat_data = materials_result.fetchone()
        mat_total = mat_data.total_content or 0
        mat_shared = mat_data.shared_content or 0

        # 12. Check-in (Eventos finalizados nos ultimos 14d)
        checkin_result = await self.db.execute(text("""
            SELECT 
                COUNT(*) as registered,
                COUNT(check_in_at) as checked_in
            FROM event_participants ep
            JOIN events e ON e.id = ep.event_id
            WHERE e.is_active = true 
            AND e.end_datetime < NOW() 
            AND e.end_datetime >= :check_start
        """), {"check_start": datetime.now(timezone.utc) - timedelta(days=14)})
        check_data = checkin_result.fetchone()
        checkin_rate = (check_data.checked_in / check_data.registered) if check_data.registered and check_data.registered > 0 else None

        # --- TERMÔMETRO (Insight) ---
        insight = {"status": "success", "title": "Engajamento saudável!", "message": f"A ativação superou a meta ({int(ACTIVATION_TARGET*100)}%) e o funil de níveis está operando normalmente."}
        
        # Regra 1: Onboarding
        if incomplete_rate > 0.20 and onb_data.total > 10:
            insight = {
                "status": "danger",
                "title": "Gargalo no cadastro",
                "message": f"{int(incomplete_rate*100)}% dos novos usuários estão abandonando o app antes de finalizar o perfil."
            }
        # Regra 2: Ativação
        elif activation_rate < ACTIVATION_TARGET and total_new > 10:
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
        elif checkin_rate is not None and checkin_rate < 0.50 and check_data.registered > 10:
             insight = {
                "status": "warning",
                "title": "Evasão em Eventos",
                "message": f"Em média, apenas {int(checkin_rate*100)}% dos inscritos estão comparecendo aos eventos recentes."
            }

        return {
            "insight": insight,
            "kpis": {
                "total_users": users_data.total,
                "new_users_week": users_data.new_this_week or 0,
                "activation_rate": activation_rate,
                "viral_coef": viral_coef,
                "avg_points": float(avg_points)
            },
            "funnel": funnel,
            "providers": providers,
            "pies": {
                "missions": missions_dist,
                "events": events_dist,
                "materials": {
                    "shared": mat_shared,
                    "not_shared": max(0, mat_total - mat_shared)
                }
            },
            "trend": signups_trend
        }

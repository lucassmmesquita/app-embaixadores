"""
═══════════════════════════════════════════════════════════════
  Events Module — Event Landing Page
  Public landing page for shared event links: /evento/{event_id}
  Tracks clicks with anti-fraud cookie and awards 10 points to referrer.
═══════════════════════════════════════════════════════════════
"""

import hashlib
import uuid
from datetime import datetime

from fastapi import APIRouter, Cookie, Depends, Query, Request, Response
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.modules.events.models import Event
from src.modules.gamification.engine import GamificationEngine
from src.modules.users.models import Profile

router = APIRouter()

POINTS_PER_CLICK = 10

EVENT_TYPE_EMOJIS = {
    "meeting": "🤝",
    "rally": "📢",
    "training": "🎓",
    "community": "🏘️",
    "online": "💻",
    "exclusive": "⭐",
}

EVENT_TYPE_LABELS = {
    "meeting": "Reunião",
    "rally": "Comício",
    "training": "Treinamento",
    "community": "Comunitário",
    "online": "Online",
    "exclusive": "Exclusivo",
}


async def _track_event_click(
    db: AsyncSession,
    event: Event,
    referrer: Profile,
    visitor_hash: str,
) -> bool:
    """
    Award points for event link click.
    Anti-fraud: only awards points once per visitor_hash per event per referrer.
    """
    engine = GamificationEngine(db)
    idempotency_key = f"{referrer.id}:event_click:{event.id}:{visitor_hash}"

    result = await engine.award_points(
        user_id=referrer.id,
        points=POINTS_PER_CLICK,
        action_type="event_click",
        description=f"Clique no evento: {event.title}",
        reference_type="event_click",
        reference_id=event.id,
        idempotency_key=idempotency_key,
    )

    await db.commit()
    return result is not None and not result.get("already_processed", True)


def _format_event_date(dt: datetime) -> str:
    """Format event date in Portuguese."""
    months = [
        "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
    ]
    weekdays = [
        "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira",
        "sexta-feira", "sábado", "domingo",
    ]
    weekday = weekdays[dt.weekday()]
    return f"{weekday}, {dt.day} de {months[dt.month]} de {dt.year}"


def _build_event_landing_html(
    event: Event,
    referrer_name: str | None = None,
    referral_code: str | None = None,
) -> str:
    """Build the event landing page HTML — brand-aligned premium design."""
    web_app_url = settings.web_app_url
    event_type_label = EVENT_TYPE_LABELS.get(event.event_type, "Evento")
    event_type_emoji = EVENT_TYPE_EMOJIS.get(event.event_type, "📅")

    shared_by = f"Compartilhado por <strong>{referrer_name}</strong>" if referrer_name else "Compartilhado por um embaixador"
    code_suffix = f"/convite/{referral_code}" if referral_code else ""

    # Format dates
    start_dt = event.start_datetime
    date_str = _format_event_date(start_dt)
    time_str = start_dt.strftime("%H:%M")
    end_time = ""
    if event.end_datetime:
        end_time = f" — {event.end_datetime.strftime('%H:%M')}"

    # Location section
    location_html = ""
    if event.location_name:
        address_line = f'<div class="detail-sub">{event.address}</div>' if event.address else ""
        city_line = f'<div class="detail-sub">{event.city}</div>' if event.city else ""
        location_html = f"""
        <div class="detail-row">
            <span class="detail-icon">📍</span>
            <div>
                <div class="detail-text">{event.location_name}</div>
                {address_line}
                {city_line}
            </div>
        </div>
        """
    elif event.online_url:
        location_html = """
        <div class="detail-row">
            <span class="detail-icon">💻</span>
            <div class="detail-text">Evento Online</div>
        </div>
        """

    # Points badge
    points_html = ""
    if event.points_reward > 0:
        points_html = f"""
        <div class="points-badge">
            ⭐ +{event.points_reward} pontos por participar
        </div>
        """

    # Cover image
    cover_html = ""
    if event.cover_image_url:
        cover_html = f"""
        <div class="preview-container">
            <img src="{event.cover_image_url}" alt="{event.title}" class="preview-image" loading="lazy">
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>{event.title} — Embaixadores</title>
    <meta name="description" content="{event.description or event.title}">
    <meta property="og:title" content="{event.title} — Embaixadores">
    <meta property="og:description" content="{event.description or 'Evento da Rede de Embaixadores'}">
    <meta property="og:type" content="article">
    <meta name="theme-color" content="#DC0000">

    <link rel="icon" type="image/png" sizes="180x180" href="/static/icon-180.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/static/icon-180.png">
    <meta property="og:image" content="{event.cover_image_url or '/static/icon.png'}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        :root {{
            --brand-red: #DC0000;
            --brand-red-dark: #B80000;
            --brand-blue: #3C50A0;
            --brand-yellow: #F0B400;
            --brand-green: #50A03C;
            --app-primary: #2171BA;
            --app-accent: #E33431;
            --app-success: #4DAA35;
            --surface-dark: #0A0A0F;
            --surface-card: #1A1A24;
            --surface-elevated: #252530;
            --text-primary: #FFFFFF;
            --text-secondary: #A0A0AB;
            --text-tertiary: #6B6B78;
            --border-subtle: rgba(255, 255, 255, 0.08);
            --font-display: 'Montserrat', system-ui, sans-serif;
            --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --space-xs: 4px; --space-sm: 8px; --space-md: 12px;
            --space-base: 16px; --space-lg: 24px; --space-xl: 32px;
            --space-2xl: 48px;
            --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
            --radius-xl: 20px; --radius-2xl: 24px; --radius-pill: 999px;
            --shadow-lg: 0 8px 32px rgba(0,0,0,0.3);
            --shadow-glow-blue: 0 0 30px rgba(33, 113, 186, 0.25);
            --transition-normal: 250ms ease;
        }}

        *, *::before, *::after {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: var(--font-body);
            background: var(--surface-dark);
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-lg);
            color: var(--text-primary);
            overflow-x: hidden;
        }}

        body::before {{
            content: '';
            position: fixed;
            inset: 0;
            background:
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(33, 113, 186, 0.15), transparent),
                radial-gradient(ellipse 60% 40% at 80% 100%, rgba(60, 80, 160, 0.12), transparent),
                radial-gradient(ellipse 50% 35% at 10% 80%, rgba(80, 160, 60, 0.08), transparent),
                linear-gradient(180deg, #0A0A0F 0%, #12121C 100%);
            z-index: -1;
        }}

        .color-bar {{
            position: fixed; top: 0; left: 0; right: 0; height: 4px;
            display: flex; z-index: 100;
        }}
        .color-bar span {{ flex: 1; }}
        .color-bar span:nth-child(1) {{ background: var(--app-accent); }}
        .color-bar span:nth-child(2) {{ background: var(--brand-yellow); }}
        .color-bar span:nth-child(3) {{ background: var(--app-success); }}
        .color-bar span:nth-child(4) {{ background: var(--app-primary); }}

        .card {{
            background: var(--surface-card);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-2xl);
            padding: var(--space-2xl) var(--space-xl);
            max-width: 440px;
            width: 100%;
            position: relative;
            box-shadow: var(--shadow-lg);
        }}

        .card::before {{
            content: '';
            position: absolute; inset: -1px;
            border-radius: var(--radius-2xl);
            background: linear-gradient(135deg, rgba(33, 113, 186, 0.15), rgba(60, 80, 160, 0.1), rgba(80, 160, 60, 0.08));
            z-index: -1;
            filter: blur(1px);
        }}

        .logo-section {{
            text-align: center;
            margin-bottom: var(--space-lg);
        }}
        .logo-container {{
            width: 88px; height: 88px;
            margin: 0 auto var(--space-base);
            background: #FFFFFF;
            border-radius: var(--radius-xl);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            overflow: hidden;
        }}
        .logo-img {{ width: 68px; height: 68px; object-fit: contain; }}
        .brand-name {{
            font-family: var(--font-display);
            font-weight: 900; font-size: 13px;
            letter-spacing: 3px; text-transform: uppercase;
            color: var(--text-primary);
        }}

        .type-badge {{
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(33, 113, 186, 0.12);
            border: 1px solid rgba(33, 113, 186, 0.2);
            color: #72B4E8;
            padding: 6px 16px;
            border-radius: var(--radius-pill);
            font-family: var(--font-display);
            font-size: 11px; font-weight: 700;
            letter-spacing: 1.5px; text-transform: uppercase;
            margin-bottom: var(--space-base);
        }}

        .heading {{
            text-align: center;
            margin-bottom: var(--space-lg);
        }}
        h1 {{
            font-family: var(--font-display);
            font-size: 24px; font-weight: 800;
            line-height: 1.2;
            margin-bottom: var(--space-sm);
            color: var(--text-primary);
        }}
        .subtitle {{
            font-size: 15px;
            color: var(--text-secondary);
            line-height: 1.6;
        }}
        .shared-by {{
            font-size: 13px;
            color: var(--text-tertiary);
            margin-top: var(--space-sm);
        }}
        .shared-by strong {{
            color: var(--text-secondary);
        }}

        /* Event-specific styles */
        .date-hero {{
            text-align: center;
            background: linear-gradient(135deg, var(--app-primary), var(--brand-blue));
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
        }}
        .date-hero-weekday {{
            font-family: var(--font-body);
            font-size: 14px;
            color: rgba(255,255,255,0.7);
            text-transform: capitalize;
            margin-bottom: 2px;
        }}
        .date-hero-day {{
            font-family: var(--font-display);
            font-size: 42px; font-weight: 900;
            color: #fff;
            line-height: 1;
        }}
        .date-hero-time {{
            font-family: var(--font-body);
            font-size: 16px; font-weight: 600;
            color: rgba(255,255,255,0.9);
            margin-top: var(--space-xs);
        }}

        .details-section {{
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }}
        .detail-row {{
            display: flex;
            align-items: flex-start;
            gap: var(--space-md);
        }}
        .detail-icon {{
            font-size: 20px;
            flex-shrink: 0;
            width: 28px;
            text-align: center;
        }}
        .detail-text {{
            font-size: 15px;
            color: var(--text-primary);
            font-weight: 500;
        }}
        .detail-sub {{
            font-size: 13px;
            color: var(--text-tertiary);
        }}

        .points-badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(77, 170, 53, 0.12);
            border: 1px solid rgba(77, 170, 53, 0.2);
            color: #7FD66A;
            padding: 8px 16px;
            border-radius: var(--radius-pill);
            font-family: var(--font-display);
            font-size: 13px; font-weight: 700;
            margin-bottom: var(--space-lg);
            text-align: center;
        }}

        .open-app-btn {{
            display: flex;
            align-items: center; justify-content: center;
            gap: var(--space-sm);
            padding: 16px var(--space-lg);
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, var(--app-accent), var(--brand-red-dark));
            color: #fff;
            font-family: var(--font-display);
            font-size: 17px; font-weight: 700;
            text-decoration: none; cursor: pointer; border: none;
            box-shadow: 0 0 40px rgba(220, 0, 0, 0.3);
            transition: all var(--transition-normal);
            margin-bottom: var(--space-md);
        }}
        .open-app-btn:hover {{
            filter: brightness(1.1);
            transform: translateY(-1px);
        }}

        .divider {{
            display: flex; align-items: center; gap: var(--space-md);
            margin: var(--space-base) 0;
        }}
        .divider::before, .divider::after {{
            content: ''; flex: 1; height: 1px;
            background: var(--border-subtle);
        }}
        .divider-text {{
            font-size: 12px; color: var(--text-tertiary);
            text-transform: uppercase; letter-spacing: 1px;
            font-weight: 600;
        }}

        .levels-bar {{
            display: flex; gap: 3px; justify-content: center;
            margin-bottom: var(--space-lg);
        }}
        .level-dot {{
            width: 8px; height: 8px; border-radius: 50%;
        }}

        .footer {{
            text-align: center;
            padding-top: var(--space-base);
            border-top: 1px solid var(--border-subtle);
        }}
        .footer-text {{ font-size: 12px; color: var(--text-tertiary); line-height: 1.6; }}
        .footer-brand {{
            font-family: var(--font-display);
            font-weight: 700; font-size: 11px;
            letter-spacing: 1px; color: var(--text-tertiary);
            margin-top: var(--space-xs);
        }}

        .preview-container {{
            margin-bottom: var(--space-lg);
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 1px solid var(--border-subtle);
        }}
        .preview-image {{
            width: 100%;
            aspect-ratio: 16 / 9;
            object-fit: cover;
            display: block;
        }}

        @media (max-width: 480px) {{
            body {{ padding: var(--space-base); }}
            .card {{ padding: var(--space-xl) var(--space-lg); border-radius: var(--radius-xl); }}
            h1 {{ font-size: 20px; }}
            .date-hero-day {{ font-size: 36px; }}
        }}
    </style>
</head>
<body>
    <div class="color-bar" role="presentation">
        <span></span><span></span><span></span><span></span>
    </div>

    <main class="card" role="main">
        <div class="logo-section">
            <div class="logo-container" aria-label="Logo Embaixadores">
                <img src="/static/icon.png" alt="Embaixadores" class="logo-img" width="68" height="68">
            </div>
            <div class="brand-name">EMBAIXADORES</div>
        </div>

        <div style="text-align: center;">
            <div class="type-badge">
                {event_type_emoji} {event_type_label}
            </div>
        </div>

        {cover_html}

        <div class="heading">
            <h1>{event.title}</h1>
            {f'<p class="subtitle">{event.description}</p>' if event.description else ''}
            <p class="shared-by">{shared_by}</p>
        </div>

        <div class="date-hero">
            <div class="date-hero-weekday">{date_str}</div>
            <div class="date-hero-day">{start_dt.day}</div>
            <div class="date-hero-time">🕐 {time_str}{end_time}</div>
        </div>

        <div class="details-section">
            {location_html}
        </div>

        <div style="text-align: center;">
            {points_html}
        </div>

        <a href="{web_app_url}{code_suffix}" class="open-app-btn" role="button" aria-label="Abrir o Aplicativo">
            📲 Abrir no App e Inscrever-se
        </a>

        <div class="levels-bar" aria-label="Níveis de gamificação" role="presentation">
            <div class="level-dot" style="background: #4DAA35;" title="Apoiador"></div>
            <div class="level-dot" style="background: #399BD8;" title="Mobilizador"></div>
            <div class="level-dot" style="background: #FAD549;" title="Líder"></div>
            <div class="level-dot" style="background: #E33431;" title="Embaixador"></div>
            <div class="level-dot" style="background: #7A3F8F;" title="Coordenador"></div>
        </div>

        <footer class="footer">
            <div class="footer-text">Faça parte da Rede de Embaixadores do INÁCIO!</div>
            <div class="footer-brand">REDE DE EMBAIXADORES DO INÁCIO © 2026</div>
        </footer>
    </main>
</body>
</html>"""


@router.get("/evento/{event_id}", response_class=HTMLResponse, include_in_schema=False)
async def event_landing_page(
    event_id: uuid.UUID,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    ref: str | None = Query(default=None, description="Referrer's referral code"),
    _ec: str | None = Cookie(default=None, alias="ec_visited"),
):
    """
    Public landing page for shared event links.
    Served at: /evento/{event_id}?ref=REFERRAL_CODE

    Tracks click and awards 10 points to referrer (anti-fraud via cookie).
    """
    # 1. Load the event
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.is_active.is_(True))
    )
    event = result.scalar_one_or_none()

    if not event:
        return HTMLResponse(
            content="<html><body><h1>Evento não encontrado</h1></body></html>",
            status_code=404,
        )

    # 2. Resolve referrer from referral code
    referrer = None
    referrer_name = None
    referral_code = ref
    if ref:
        ref_result = await db.execute(
            select(Profile).where(Profile.referral_code == ref)
        )
        referrer = ref_result.scalar_one_or_none()
        if referrer:
            referrer_name = referrer.full_name

    # 3. Track click (anti-fraud)
    if referrer and not _ec:
        client_ip = request.client.host if request.client else "unknown"
        ua = request.headers.get("user-agent", "unknown")
        raw = f"{client_ip}:{ua}:{event_id}:{referrer.id}"
        visitor_hash = hashlib.sha256(raw.encode()).hexdigest()[:32]

        await _track_event_click(db, event, referrer, visitor_hash)

        # Set anti-fraud cookie (24h)
        response.set_cookie(
            key="ec_visited",
            value=f"{event_id}:{referrer.id}",
            max_age=86400,
            httponly=True,
            samesite="lax",
        )

    # 4. Render the page
    html = _build_event_landing_html(event, referrer_name, referral_code)
    return HTMLResponse(content=html)

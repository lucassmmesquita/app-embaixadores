"""
═══════════════════════════════════════════════════════════════
  Content Module — Material Landing Page
  Public landing page for shared material links: /material/{content_id}
  Tracks clicks with anti-fraud cookie and awards 10 points to referrer.
═══════════════════════════════════════════════════════════════
"""

import hashlib
import uuid

from fastapi import APIRouter, Cookie, Depends, Query, Request, Response
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.modules.content.constants import CONTENT_TYPE_EMOJIS, CONTENT_TYPE_LABELS
from src.modules.content.models import Content, MaterialClick
from src.modules.gamification.engine import GamificationEngine
from src.modules.users.models import Profile

router = APIRouter()


async def _track_click(
    db: AsyncSession,
    content: Content,
    referrer: Profile,
    visitor_hash: str,
) -> bool:
    """
    Record a material click. Returns True if this is a NEW click (points awarded).
    Anti-fraud: only awards points once per visitor_hash per content per referrer.
    """
    # Check if this visitor already clicked this material from this referrer
    existing = await db.execute(
        select(MaterialClick).where(
            MaterialClick.content_id == content.id,
            MaterialClick.referrer_id == referrer.id,
            MaterialClick.visitor_hash == visitor_hash,
        )
    )
    if existing.scalar_one_or_none():
        return False  # Already tracked

    # Record click
    click = MaterialClick(
        content_id=content.id,
        referrer_id=referrer.id,
        visitor_hash=visitor_hash,
        points_awarded=True,
    )
    db.add(click)

    # Award points to referrer (using the material's configured points)
    engine = GamificationEngine(db)
    await engine.award_points(
        user_id=referrer.id,
        points=content.points_per_share,
        action_type="material_click",
        description=f"Clique no material: {content.title}",
        reference_type="material_click",
        reference_id=content.id,
        idempotency_key=f"{referrer.id}:material_click:{content.id}:{visitor_hash}",
    )

    await db.commit()
    return True


def _build_material_landing_html(
    content: Content,
    referrer_name: str | None = None,
    referral_code: str | None = None,
) -> str:
    """Build the material landing page HTML — brand-aligned premium design."""
    web_app_url = settings.web_app_url
    content_type_label = CONTENT_TYPE_LABELS.get(content.content_type, "Material")

    content_type_icon = CONTENT_TYPE_EMOJIS.get(content.content_type, "📋")

    shared_by = f"Compartilhado por <strong>{referrer_name}</strong>" if referrer_name else "Compartilhado por um embaixador"

    # Build the code suffix for the "open app" button
    code_suffix = f"/convite/{referral_code}" if referral_code else ""

    # File URL for direct access (if available)
    file_link = ""
    if content.file_url:
        file_link = f"""
        <a href="{content.file_url}" class="open-material-btn" target="_blank" rel="noopener noreferrer" role="button" aria-label="Ver Material">
            <span class="open-material-icon">{content_type_icon}</span>
            Ver {content_type_label}
        </a>
        """

    # Thumbnail preview
    thumbnail_html = ""
    thumb_url = content.thumbnail_url or None
    if thumb_url:
        thumbnail_html = f"""
        <div class="preview-container">
            <img src="{thumb_url}" alt="{content.title}" class="preview-image" loading="lazy">
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>{content.title} — Embaixadores</title>
    <meta name="description" content="{content.description or content.title}">
    <meta property="og:title" content="{content.title} — Embaixadores">
    <meta property="og:description" content="{content.description or 'Material compartilhado pela Rede de Embaixadores'}">
    <meta property="og:type" content="article">
    <meta name="theme-color" content="#DC0000">

    <!-- ═══ FAVICON ═══ -->
    <link rel="icon" type="image/png" sizes="180x180" href="/static/icon-180.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/static/icon-180.png">

    <!-- ═══ OG IMAGE ═══ -->
    <meta property="og:image" content="{content.thumbnail_url or '/static/icon.png'}">

    <!-- ═══ TYPOGRAPHY ═══ -->
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

        .open-material-btn {{
            display: flex;
            align-items: center; justify-content: center;
            gap: var(--space-sm);
            padding: 16px var(--space-lg);
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, var(--app-primary), var(--brand-blue));
            color: #fff;
            font-family: var(--font-display);
            font-size: 17px; font-weight: 700;
            text-decoration: none; cursor: pointer; border: none;
            box-shadow: var(--shadow-glow-blue);
            transition: all var(--transition-normal);
            margin-bottom: var(--space-md);
        }}
        .open-material-btn:hover {{
            filter: brightness(1.1);
            transform: translateY(-1px);
        }}
        .open-material-icon {{ font-size: 20px; }}

        .open-app-btn {{
            display: flex;
            align-items: center; justify-content: center;
            gap: var(--space-sm);
            padding: 14px var(--space-lg);
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, var(--app-accent), var(--brand-red-dark));
            color: #fff;
            font-family: var(--font-display);
            font-size: 16px; font-weight: 700;
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
                {content_type_icon} {content_type_label}
            </div>
        </div>

        {thumbnail_html}

        <div class="heading">
            <h1>{content.title}</h1>
            {f'<p class="subtitle">{content.description}</p>' if content.description else ''}
            <p class="shared-by">{shared_by}</p>
        </div>

        {file_link}

        <div class="divider">
            <span class="divider-text">Abra no app</span>
        </div>

        <a href="{web_app_url}{code_suffix}" class="open-app-btn" role="button" aria-label="Abrir o Aplicativo">
            📲 Abrir o Aplicativo
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


@router.get("/material/{content_id}", response_class=HTMLResponse, include_in_schema=False)
async def material_landing_page(
    content_id: uuid.UUID,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    ref: str | None = Query(default=None, description="Referrer's referral code"),
    _mc: str | None = Cookie(default=None, alias="mc_visited"),
):
    """
    Public landing page for shared material links.
    Served at: /material/{content_id}?ref=REFERRAL_CODE

    Tracks click and awards 10 points to referrer (anti-fraud via cookie).
    """
    # 1. Load the content
    result = await db.execute(
        select(Content).where(Content.id == content_id, Content.is_active.is_(True))
    )
    content = result.scalar_one_or_none()

    if not content:
        return HTMLResponse(
            content="<html><body><h1>Material não encontrado</h1></body></html>",
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
    if referrer and not _mc:
        # Generate visitor hash from IP + User-Agent for uniqueness
        client_ip = request.client.host if request.client else "unknown"
        ua = request.headers.get("user-agent", "unknown")
        raw = f"{client_ip}:{ua}:{content_id}:{referrer.id}"
        visitor_hash = hashlib.sha256(raw.encode()).hexdigest()[:32]

        await _track_click(db, content, referrer, visitor_hash)

        # Set anti-fraud cookie (24h)
        response.set_cookie(
            key="mc_visited",
            value=f"{content_id}:{referrer.id}",
            max_age=86400,
            httponly=True,
            samesite="lax",
        )

    # 4. Render the page
    html = _build_material_landing_html(content, referrer_name, referral_code)
    return HTMLResponse(content=html)

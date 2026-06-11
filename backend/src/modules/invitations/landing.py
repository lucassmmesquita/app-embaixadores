"""
═══════════════════════════════════════════════════════════════
  Invitations Module — Landing Page
  Public landing page for invite links: /convite/{code}
  ARIA-compliant, brand-aligned, premium design
═══════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from src.core.config import settings

router = APIRouter()


def _build_landing_html(referral_code: str | None = None, inviter_name: str | None = None) -> str:
    """Build the landing page HTML for an invite link — ARIA UX/UI standards."""
    has_code = referral_code is not None and referral_code.strip() != ""
    if has_code:
        greeting = f"{inviter_name} convidou você" if inviter_name else "Você foi convidado(a)"
    else:
        greeting = "Você foi convidado(a)"
        referral_code = ""  # prevent f-string errors
    web_app_url = settings.web_app_url
    code_suffix = f"/convite/{referral_code}" if has_code else ""

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Convite — Embaixadores</title>
    <meta name="description" content="{greeting} para a Rede de Embaixadores do INÁCIO! Faça parte da maior rede de mobilização do Brasil.">
    <meta property="og:title" content="Convite — Embaixadores">
    <meta property="og:description" content="{greeting} para a Rede de Embaixadores do INÁCIO! Faça parte da maior rede de mobilização do Brasil.">
    <meta property="og:type" content="website">
    <meta name="theme-color" content="#DC0000">

    <!-- ═══ FAVICON ═══ -->
    <link rel="icon" type="image/png" sizes="180x180" href="/static/icon-180.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/static/icon-180.png">
    <link rel="shortcut icon" href="/static/icon-180.png">

    <!-- ═══ OG IMAGE ═══ -->
    <meta property="og:image" content="/static/icon.png">

    <!-- ═══ TYPOGRAPHY — Montserrat (brand-aligned) + Inter (body) ═══ -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        /* ═══════════════════════════════════════════
           DESIGN TOKENS — Embaixadores
           ═══════════════════════════════════════════ */
        :root {{
            /* Brand Colors — from GUIA_DE_MARCA.md */
            --brand-red: #DC0000;
            --brand-red-dark: #B80000;
            --brand-red-glow: rgba(220, 0, 0, 0.25);
            --brand-blue: #3C50A0;
            --brand-magenta: #DC508C;
            --brand-yellow: #F0B400;
            --brand-green: #50A03C;
            --brand-star: #F0B400;

            /* App Theme Colors */
            --app-primary: #2171BA;
            --app-accent: #E33431;
            --app-success: #4DAA35;

            /* Surfaces & Text */
            --surface-dark: #0A0A0F;
            --surface-card: #1A1A24;
            --surface-elevated: #252530;
            --text-primary: #FFFFFF;
            --text-secondary: #A0A0AB;
            --text-tertiary: #6B6B78;
            --border-subtle: rgba(255, 255, 255, 0.08);

            /* Typography */
            --font-display: 'Montserrat', system-ui, sans-serif;
            --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

            /* Spacing Scale */
            --space-xs: 4px;
            --space-sm: 8px;
            --space-md: 12px;
            --space-base: 16px;
            --space-lg: 24px;
            --space-xl: 32px;
            --space-2xl: 48px;
            --space-3xl: 64px;

            /* Radii */
            --radius-sm: 8px;
            --radius-md: 12px;
            --radius-lg: 16px;
            --radius-xl: 20px;
            --radius-2xl: 24px;
            --radius-pill: 999px;

            /* Shadows */
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
            --shadow-md: 0 4px 12px rgba(0,0,0,0.2);
            --shadow-lg: 0 8px 32px rgba(0,0,0,0.3);
            --shadow-glow-red: 0 0 40px rgba(220, 0, 0, 0.3);
            --shadow-glow-blue: 0 0 30px rgba(33, 113, 186, 0.25);

            /* Transitions */
            --transition-fast: 150ms ease;
            --transition-normal: 250ms ease;
            --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
        }}

        /* ═══ RESET & BASE ═══ */
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

        /* ═══ BACKGROUND — Brand gradient with subtle pattern ═══ */
        body::before {{
            content: '';
            position: fixed;
            inset: 0;
            background:
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(220, 0, 0, 0.15), transparent),
                radial-gradient(ellipse 60% 40% at 80% 100%, rgba(60, 80, 160, 0.12), transparent),
                radial-gradient(ellipse 50% 35% at 10% 80%, rgba(80, 160, 60, 0.08), transparent),
                linear-gradient(180deg, #0A0A0F 0%, #12121C 100%);
            z-index: -1;
        }}

        /* ═══ COLOR BAR (Signature visual — 4 brand colors) ═══ */
        .color-bar {{
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            display: flex;
            z-index: 100;
        }}
        .color-bar span {{
            flex: 1;
        }}
        .color-bar span:nth-child(1) {{ background: var(--app-accent); }}
        .color-bar span:nth-child(2) {{ background: var(--brand-yellow); }}
        .color-bar span:nth-child(3) {{ background: var(--app-success); }}
        .color-bar span:nth-child(4) {{ background: var(--app-primary); }}

        /* ═══ MAIN CARD ═══ */
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

        /* Subtle glow behind card */
        .card::before {{
            content: '';
            position: absolute;
            inset: -1px;
            border-radius: var(--radius-2xl);
            background: linear-gradient(135deg, rgba(220, 0, 0, 0.15), rgba(60, 80, 160, 0.1), rgba(80, 160, 60, 0.08));
            z-index: -1;
            filter: blur(1px);
        }}

        /* ═══ LOGO SECTION ═══ */
        .logo-section {{
            text-align: center;
            margin-bottom: var(--space-lg);
        }}

        .logo-container {{
            width: 88px;
            height: 88px;
            margin: 0 auto var(--space-base);
            background: #FFFFFF;
            border-radius: var(--radius-xl);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-md);
            position: relative;
            overflow: hidden;
        }}

        /* Logo as actual image */
        .logo-img {{
            width: 68px;
            height: 68px;
            object-fit: contain;
        }}

        .brand-name {{
            font-family: var(--font-display);
            font-weight: 900;
            font-size: 13px;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: var(--text-secondary);
        }}

        .brand-name .rede {{ color: var(--brand-green); }}
        .brand-name .embaixadores {{ color: var(--text-primary); }}

        /* ═══ BADGE ═══ */
        .badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(220, 0, 0, 0.12);
            border: 1px solid rgba(220, 0, 0, 0.2);
            color: #FF6B6B;
            padding: 6px 16px;
            border-radius: var(--radius-pill);
            font-family: var(--font-display);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: var(--space-base);
        }}

        .badge-dot {{
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--app-accent);
            animation: pulse-dot 2s ease-in-out infinite;
        }}

        @keyframes pulse-dot {{
            0%, 100% {{ opacity: 1; transform: scale(1); }}
            50% {{ opacity: 0.5; transform: scale(0.7); }}
        }}

        /* ═══ HEADING ═══ */
        .heading {{
            text-align: center;
            margin-bottom: var(--space-lg);
        }}

        h1 {{
            font-family: var(--font-display);
            font-size: 26px;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: var(--space-sm);
            color: var(--text-primary);
        }}

        .subtitle {{
            font-size: 15px;
            color: var(--text-secondary);
            line-height: 1.6;
        }}

        /* ═══ TAGLINE ═══ */
        .tagline {{
            text-align: center;
            margin-bottom: var(--space-lg);
        }}

        .tagline-text {{
            font-family: var(--font-display);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 3px;
            text-transform: uppercase;
        }}

        .tagline-text .t1 {{ color: var(--app-accent); }}
        .tagline-text .t2 {{ color: var(--brand-yellow); }}
        .tagline-text .t3 {{ color: var(--app-success); }}



        /* ═══ STEPS ═══ */
        .steps {{
            margin-bottom: var(--space-lg);
        }}

        .step {{
            display: flex;
            align-items: flex-start;
            gap: var(--space-md);
            padding: var(--space-md) 0;
        }}

        .step + .step {{
            border-top: 1px solid var(--border-subtle);
        }}

        .step-number {{
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--font-display);
            font-size: 14px;
            font-weight: 800;
            color: #fff;
            margin-top: 2px;
        }}

        .step:nth-child(1) .step-number {{ background: var(--app-accent); }}
        .step:nth-child(2) .step-number {{ background: var(--brand-yellow); color: #1D1D1F; }}
        .step:nth-child(3) .step-number {{ background: var(--app-success); }}

        .step-text {{
            font-size: 15px;
            color: var(--text-secondary);
            line-height: 1.5;
        }}

        .step-text strong {{
            color: var(--text-primary);
            font-weight: 600;
        }}

        .step-code {{
            color: var(--app-accent);
            font-family: var(--font-display);
            font-weight: 800;
        }}

        /* ═══ DOWNLOAD BUTTONS (Store Badges) ═══ */
        .download-buttons {{
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }}

        .store-badge {{
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: 10px 16px;
            border-radius: var(--radius-md);
            text-decoration: none;
            cursor: pointer;
            transition: all var(--transition-normal);
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: transparent;
            opacity: 0.6;
        }}

        .store-badge:hover {{
            opacity: 0.85;
            border-color: rgba(255, 255, 255, 0.15);
        }}

        .store-badge:active {{
            transform: scale(0.98);
        }}

        .store-badge-icon {{
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}

        .store-badge-text {{
            display: flex;
            flex-direction: column;
        }}

        .store-badge-label {{
            font-family: var(--font-body);
            font-size: 10px;
            color: var(--text-tertiary);
            line-height: 1.2;
        }}

        .store-badge-name {{
            font-family: var(--font-display);
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            line-height: 1.3;
        }}

        /* ═══ OPEN IN APP BUTTON ═══ */
        .open-app-btn {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            padding: 16px var(--space-lg);
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, var(--app-accent), var(--brand-red-dark));
            color: #fff;
            font-family: var(--font-display);
            font-size: 17px;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
            border: none;
            box-shadow: var(--shadow-glow-red);
            transition: all var(--transition-normal);
            margin-bottom: var(--space-md);
        }}

        .open-app-btn:hover {{
            filter: brightness(1.1);
            transform: translateY(-1px);
        }}

        .open-app-btn:active {{
            transform: scale(0.98);
        }}

        .open-app-icon {{
            font-size: 20px;
        }}

        /* ═══ LEVEL COLORS (gamification visual) ═══ */
        .levels-bar {{
            display: flex;
            gap: 3px;
            justify-content: center;
            margin-bottom: var(--space-lg);
        }}

        .level-dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }}

        /* ═══ FOOTER ═══ */
        .footer {{
            text-align: center;
            padding-top: var(--space-base);
            border-top: 1px solid var(--border-subtle);
        }}

        .footer-text {{
            font-size: 12px;
            color: var(--text-tertiary);
            line-height: 1.6;
        }}

        .footer-brand {{
            font-family: var(--font-display);
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 1px;
            color: var(--text-tertiary);
            margin-top: var(--space-xs);
        }}



        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 480px) {{
            body {{
                padding: var(--space-base);
            }}
            .card {{
                padding: var(--space-xl) var(--space-lg);
                border-radius: var(--radius-xl);
            }}
            h1 {{
                font-size: 22px;
            }}

        }}

        /* ═══ ACCESSIBILITY — Focus states ═══ */
        .store-badge:focus-visible {{
            outline: 2px solid var(--brand-yellow);
            outline-offset: 2px;
        }}
    </style>
</head>
<body>
    <!-- ═══ COLOR BAR — Brand signature ═══ -->
    <div class="color-bar" role="presentation">
        <span></span><span></span><span></span><span></span>
    </div>

    <main class="card" role="main">
        <!-- ═══ LOGO ═══ -->
        <div class="logo-section">
            <div class="logo-container" aria-label="Logo Embaixadores">
                <img src="/static/icon.png" alt="Embaixadores" class="logo-img" width="68" height="68">
            </div>
            <div class="brand-name">
                <span class="embaixadores">EMBAIXADORES</span>
            </div>
        </div>

        <!-- ═══ BADGE ═══ -->
        <div style="text-align: center;">
            <div class="badge">
                <span class="badge-dot"></span>
                Convite exclusivo
            </div>
        </div>

        <!-- ═══ HEADING ═══ -->
        <div class="heading">
            <h1>{greeting} para a Rede de Embaixadores do INÁCIO!</h1>
            <p class="subtitle">
                Faça parte da maior rede de mobilização do Brasil.
                Venha fazer parte da mudança!
            </p>
        </div>

        <!-- ═══ TAGLINE ═══ -->
        <div class="tagline">
            <div class="tagline-text">
                <span class="t1">Participe.</span>
                <span class="t2"> Mobilize.</span>
                <span class="t3"> Transforme.</span>
            </div>
        </div>



        <!-- ═══ STEPS ═══ -->
        <div class="steps" role="list" aria-label="Passos para participar">
            <div class="step" role="listitem">
                <div class="step-number">1</div>
                <div class="step-text"><strong>Baixe o app</strong> usando os botões abaixo</div>
            </div>
            <div class="step" role="listitem">
                <div class="step-number">2</div>
                <div class="step-text"><strong>Crie sua conta</strong> com Google, Apple ou e-mail</div>
            </div>
            {'<div class="step" role="listitem"><div class="step-number">3</div><div class="step-text">Cadastre-se e use o código de convite: <span class="step-code">' + referral_code + '</span></div></div>' if has_code else '<div class="step" role="listitem"><div class="step-number">3</div><div class="step-text"><strong>Comece a mobilizar</strong> sua rede de contatos</div></div>'}
        </div>

        <!-- ═══ OPEN IN APP BUTTON ═══ -->
        <a href="{web_app_url}{code_suffix}" class="open-app-btn" id="open-app-btn" role="button" aria-label="Abrir o Aplicativo">
            <span class="open-app-icon">📲</span>
            Abrir o Aplicativo
        </a>

        <!-- ═══ DOWNLOAD BUTTONS (Store Badges) ═══ -->
        <div class="download-buttons">
            <a href="#" class="store-badge" id="btn-appstore" role="button" aria-label="Baixar na App Store">
                <div class="store-badge-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.94 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="white"/>
                    </svg>
                </div>
                <div class="store-badge-text">
                    <span class="store-badge-label">Disponível na</span>
                    <span class="store-badge-name">App Store</span>
                </div>
            </a>
            <a href="#" class="store-badge" id="btn-googleplay" role="button" aria-label="Disponível no Google Play">
                <div class="store-badge-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M3.18 1.18C2.84 1.56 2.66 2.1 2.66 2.78V21.22C2.66 21.9 2.84 22.44 3.18 22.82L3.26 22.9L13.58 12.58V12.42L3.26 2.1L3.18 1.18Z" fill="#4285F4"/>
                        <path d="M17 16L13.58 12.58V12.42L17 9L17.1 9.06L21.16 11.36C22.32 12 22.32 13 21.16 13.66L17.1 15.94L17 16Z" fill="#FBBC04"/>
                        <path d="M17.1 15.94L13.58 12.5L3.18 22.82C3.62 23.28 4.34 23.34 5.14 22.88L17.1 15.94Z" fill="#EA4335"/>
                        <path d="M17.1 9.06L5.14 2.12C4.34 1.66 3.62 1.72 3.18 2.18L13.58 12.5L17.1 9.06Z" fill="#34A853"/>
                    </svg>
                </div>
                <div class="store-badge-text">
                    <span class="store-badge-label">Disponível no</span>
                    <span class="store-badge-name">Google Play</span>
                </div>
            </a>
        </div>



        <!-- ═══ LEVEL COLORS ═══ -->
        <div class="levels-bar" aria-label="Níveis de gamificação" role="presentation">
            <div class="level-dot" style="background: #4DAA35;" title="Apoiador"></div>
            <div class="level-dot" style="background: #399BD8;" title="Mobilizador"></div>
            <div class="level-dot" style="background: #FAD549;" title="Líder"></div>
            <div class="level-dot" style="background: #E33431;" title="Embaixador"></div>
            <div class="level-dot" style="background: #7A3F8F;" title="Coordenador"></div>
        </div>

        <!-- ═══ FOOTER ═══ -->
        <footer class="footer">
            <div class="footer-text">Ao se cadastrar, você aceita os termos de uso e a política de privacidade.</div>
            <div class="footer-brand">REDE DE EMBAIXADORES DO INÁCIO © 2026</div>
        </footer>
    </main>



    <script>


        /* ═══ SMART DEEP LINK — Try to open app first ═══ */
        (function() {{
            const CODE = '{referral_code}';
            const HAS_CODE = {'true' if has_code else 'false'};
            const DEEP_LINK = HAS_CODE ? 'embaixadores://convite/' + CODE : 'embaixadores://';
            const ua = navigator.userAgent;
            const isIOS = /iPad|iPhone|iPod/.test(ua);
            const isAndroid = /Android/.test(ua);
            const isMobile = isIOS || isAndroid;

            /* Platform detection: reorder store badges */
            if (isAndroid) {{
                const appstore = document.getElementById('btn-appstore');
                const gplay = document.getElementById('btn-googleplay');
                if (gplay && appstore) {{
                    gplay.parentNode.insertBefore(gplay, appstore);
                }}
            }}

            /* On mobile, try to open the app automatically via deep link */
            if (isMobile) {{
                var didLeave = false;

                document.addEventListener('visibilitychange', function() {{
                    if (document.hidden) didLeave = true;
                }});
                window.addEventListener('blur', function() {{
                    didLeave = true;
                }});

                /* Try opening via custom scheme */
                window.location.href = DEEP_LINK;
            }}
        }})();
    </script>
</body>
</html>"""


@router.get("/convite", response_class=HTMLResponse, include_in_schema=False)
async def invite_landing_generic():
    """
    Generic landing page without invite code.
    Served at: https://app-embaixadores.onrender.com/convite
    """
    return HTMLResponse(content=_build_landing_html())


@router.get("/convite/{code}", response_class=HTMLResponse, include_in_schema=False)
async def invite_landing_page(code: str):
    """
    Public landing page for invite links.
    Served at: https://app-embaixadores.onrender.com/convite/{code}
    """
    # We serve the page regardless of whether the code is valid
    # to avoid information disclosure. The code is validated at registration.
    return HTMLResponse(content=_build_landing_html(code))


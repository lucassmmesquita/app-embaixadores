"""
═══════════════════════════════════════════════════════════════
  Invitations Module — Landing Page
  Public landing page for invite links: /convite/{code}
  ARIA-compliant, brand-aligned, premium design
═══════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()


def _build_landing_html(referral_code: str, inviter_name: str | None = None) -> str:
    """Build the landing page HTML for an invite link — ARIA UX/UI standards."""
    greeting = f"{inviter_name} convidou você" if inviter_name else "Você foi convidado(a)"

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Convite — Rede de Embaixadores</title>
    <meta name="description" content="{greeting} para a Rede de Embaixadores! Use o código {referral_code} ao se cadastrar.">
    <meta property="og:title" content="Convite — Rede de Embaixadores">
    <meta property="og:description" content="{greeting} para participar da Rede de Embaixadores! Baixe o app e use o código {referral_code}.">
    <meta property="og:type" content="website">
    <meta name="theme-color" content="#DC0000">

    <!-- ═══ TYPOGRAPHY — Montserrat (brand-aligned) + Inter (body) ═══ -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        /* ═══════════════════════════════════════════
           DESIGN TOKENS — Rede de Embaixadores
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

        /* Logo as inline SVG inspired by the app icon */
        .logo-svg {{
            width: 64px;
            height: 64px;
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

        /* ═══ CODE SECTION ═══ */
        .code-section {{
            background: var(--surface-elevated);
            border: 1px dashed rgba(255, 255, 255, 0.12);
            border-radius: var(--radius-lg);
            padding: var(--space-lg) var(--space-base);
            margin-bottom: var(--space-lg);
            text-align: center;
            position: relative;
            transition: border-color var(--transition-normal);
        }}

        .code-section:hover {{
            border-color: rgba(220, 0, 0, 0.3);
        }}

        .code-label {{
            font-size: 11px;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
            margin-bottom: var(--space-sm);
        }}

        .code-value {{
            font-family: var(--font-display);
            font-size: 36px;
            font-weight: 900;
            letter-spacing: 6px;
            background: linear-gradient(135deg, var(--app-accent), var(--brand-red));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: var(--space-md);
        }}

        .copy-btn {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(220, 0, 0, 0.1);
            border: 1px solid rgba(220, 0, 0, 0.2);
            color: #FF6B6B;
            padding: 8px 20px;
            border-radius: var(--radius-pill);
            font-family: var(--font-body);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition-normal);
        }}

        .copy-btn:hover {{
            background: rgba(220, 0, 0, 0.18);
            transform: translateY(-1px);
        }}

        .copy-btn:active {{
            transform: scale(0.97);
        }}

        .copy-btn.copied {{
            background: rgba(77, 170, 53, 0.15);
            border-color: rgba(77, 170, 53, 0.3);
            color: var(--app-success);
        }}

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

        /* ═══ DOWNLOAD BUTTONS ═══ */
        .download-buttons {{
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }}

        .download-btn {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            padding: var(--space-base) var(--space-lg);
            border-radius: var(--radius-lg);
            font-family: var(--font-body);
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all var(--transition-normal);
            border: none;
        }}

        .download-btn:active {{
            transform: scale(0.98);
        }}

        .btn-primary {{
            background: linear-gradient(135deg, var(--app-accent), var(--brand-red-dark));
            color: #fff;
            box-shadow: var(--shadow-glow-red);
        }}

        .btn-primary:hover {{
            filter: brightness(1.1);
            transform: translateY(-1px);
        }}

        .btn-secondary {{
            background: var(--surface-elevated);
            border: 1px solid var(--border-subtle);
            color: var(--text-primary);
        }}

        .btn-secondary:hover {{
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(255, 255, 255, 0.15);
        }}

        .btn-icon {{
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

        /* ═══ TOAST ═══ */
        .toast {{
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: var(--app-success);
            color: #fff;
            padding: 12px 28px;
            border-radius: var(--radius-pill);
            font-family: var(--font-body);
            font-size: 14px;
            font-weight: 600;
            opacity: 0;
            transition: all var(--transition-slow);
            pointer-events: none;
            z-index: 200;
            box-shadow: 0 4px 20px rgba(77, 170, 53, 0.3);
        }}

        .toast.show {{
            opacity: 1;
            transform: translateX(-50%) translateY(0);
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
            .code-value {{
                font-size: 28px;
                letter-spacing: 4px;
            }}
        }}

        /* ═══ ACCESSIBILITY — Focus states ═══ */
        .copy-btn:focus-visible,
        .download-btn:focus-visible {{
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
            <div class="logo-container" aria-label="Logo Rede de Embaixadores">
                <svg class="logo-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <!-- Star -->
                    <polygon points="50,6 53,16 63,16 55,22 58,32 50,26 42,32 45,22 37,16 47,16" fill="#F0B400"/>
                    <!-- Red figure (center/top) -->
                    <circle cx="50" cy="36" r="5" fill="#DC2828"/>
                    <path d="M50 42 L38 60 L50 52 L62 60 Z" fill="#DC2828"/>
                    <!-- Blue figure (left) -->
                    <circle cx="28" cy="48" r="4.5" fill="#3C50A0"/>
                    <path d="M20 72 Q28 56 36 72 Q28 68 20 72" fill="#3C50A0"/>
                    <!-- Magenta figure (right) -->
                    <circle cx="72" cy="48" r="4.5" fill="#DC508C"/>
                    <path d="M64 72 Q72 56 80 72 Q72 68 64 72" fill="#DC508C"/>
                    <!-- Yellow figure (bottom-left) -->
                    <circle cx="36" cy="68" r="4" fill="#F0B400"/>
                    <path d="M28 88 Q36 74 44 88 Q36 84 28 88" fill="#F0B400"/>
                    <!-- Green figure (bottom-right) -->
                    <circle cx="64" cy="68" r="4" fill="#50A03C"/>
                    <path d="M56 88 Q64 74 72 88 Q64 84 56 88" fill="#50A03C"/>
                </svg>
            </div>
            <div class="brand-name">
                <span class="rede">REDE DE</span> <span class="embaixadores">EMBAIXADORES</span>
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
            <h1>{greeting} para a Rede de Embaixadores!</h1>
            <p class="subtitle">
                Faça parte da maior rede de mobilização do Brasil.
                Complete missões, ganhe pontos e suba de nível!
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

        <!-- ═══ CODE ═══ -->
        <div class="code-section" id="code-section" role="region" aria-label="Código de convite">
            <div class="code-label">Seu código de convite</div>
            <div class="code-value" id="code" aria-label="Código {referral_code}">{referral_code}</div>
            <button class="copy-btn" id="copy-btn" onclick="copyCode()" aria-label="Copiar código de convite">
                <span id="copy-icon">📋</span>
                <span id="copy-text">Copiar código</span>
            </button>
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
            <div class="step" role="listitem">
                <div class="step-number">3</div>
                <div class="step-text">Use o código <span class="step-code">{referral_code}</span> no campo "Código de Indicação"</div>
            </div>
        </div>

        <!-- ═══ DOWNLOAD BUTTONS ═══ -->
        <div class="download-buttons">
            <a href="#" class="download-btn btn-primary" id="btn-primary-download" role="button" aria-label="Baixar na App Store">
                <span class="btn-icon">🍎</span>
                Baixar na App Store
            </a>
            <a href="#" class="download-btn btn-secondary" id="btn-secondary-download" role="button" aria-label="Baixar no Google Play">
                <span class="btn-icon">▶️</span>
                Baixar no Google Play
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
            <div class="footer-brand">REDE DE EMBAIXADORES © 2026</div>
        </footer>
    </main>

    <!-- ═══ TOAST ═══ -->
    <div class="toast" id="toast" role="status" aria-live="polite">✅ Código copiado!</div>

    <script>
        /* ═══ COPY CODE ═══ */
        function copyCode() {{
            const code = document.getElementById('code').textContent;
            navigator.clipboard.writeText(code).then(() => {{
                const btn = document.getElementById('copy-btn');
                const toast = document.getElementById('toast');

                btn.classList.add('copied');
                document.getElementById('copy-icon').textContent = '✅';
                document.getElementById('copy-text').textContent = 'Copiado!';
                toast.classList.add('show');

                setTimeout(() => {{
                    toast.classList.remove('show');
                    btn.classList.remove('copied');
                    document.getElementById('copy-icon').textContent = '📋';
                    document.getElementById('copy-text').textContent = 'Copiar código';
                }}, 2500);
            }}).catch(() => {{
                /* Fallback for older browsers */
                const el = document.createElement('textarea');
                el.value = code;
                el.style.position = 'fixed';
                el.style.opacity = '0';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);

                document.getElementById('copy-icon').textContent = '✅';
                document.getElementById('copy-text').textContent = 'Copiado!';
                setTimeout(() => {{
                    document.getElementById('copy-icon').textContent = '📋';
                    document.getElementById('copy-text').textContent = 'Copiar código';
                }}, 2500);
            }});
        }}

        /* ═══ PLATFORM DETECTION ═══ */
        (function() {{
            const ua = navigator.userAgent;
            const isIOS = /iPad|iPhone|iPod/.test(ua);
            const isAndroid = /Android/.test(ua);
            const primary = document.getElementById('btn-primary-download');
            const secondary = document.getElementById('btn-secondary-download');

            if (isAndroid) {{
                /* Swap: show Google Play as primary */
                primary.innerHTML = '<span class="btn-icon">▶️</span> Baixar no Google Play';
                primary.setAttribute('aria-label', 'Baixar no Google Play');
                secondary.innerHTML = '<span class="btn-icon">🍎</span> Também na App Store';
                secondary.setAttribute('aria-label', 'Baixar na App Store');
            }}
        }})();
    </script>
</body>
</html>"""


@router.get("/convite/{code}", response_class=HTMLResponse, include_in_schema=False)
async def invite_landing_page(code: str):
    """
    Public landing page for invite links.
    Served at: https://app-embaixadores.onrender.com/convite/{code}
    """
    # We serve the page regardless of whether the code is valid
    # to avoid information disclosure. The code is validated at registration.
    return HTMLResponse(content=_build_landing_html(code))


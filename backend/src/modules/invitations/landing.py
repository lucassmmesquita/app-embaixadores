"""
═══════════════════════════════════════════════════════════════
  Invitations Module — Landing Page
  Public landing page for invite links: /convite/{code}
  Serves a beautiful HTML page with app download links
═══════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


def _build_landing_html(referral_code: str, inviter_name: str | None = None) -> str:
    """Build the landing page HTML for an invite link."""
    greeting = f"{inviter_name} convidou você" if inviter_name else "Você foi convidado"

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convite — Rede de Embaixadores</title>
    <meta name="description" content="{greeting} para a Rede de Embaixadores! Use o código {referral_code} ao se cadastrar.">
    <meta property="og:title" content="Convite — Rede de Embaixadores">
    <meta property="og:description" content="{greeting} para participar da Rede de Embaixadores! Baixe o app e use o código {referral_code}.">
    <meta property="og:type" content="website">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #0A0F1E 0%, #1a1f3a 50%, #0A0F1E 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            color: #fff;
        }}

        .card {{
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 48px 32px;
            max-width: 420px;
            width: 100%;
            text-align: center;
        }}

        .logo {{
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #007AFF, #5856D6);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 36px;
            font-weight: 800;
            color: #fff;
            box-shadow: 0 8px 32px rgba(0, 122, 255, 0.3);
        }}

        .badge {{
            display: inline-block;
            background: linear-gradient(135deg, #007AFF, #5856D6);
            color: #fff;
            padding: 6px 16px;
            border-radius: 100px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 16px;
        }}

        h1 {{
            font-size: 28px;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #fff, #a0b4d0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .subtitle {{
            font-size: 16px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.5;
            margin-bottom: 32px;
        }}

        .code-section {{
            background: rgba(255, 255, 255, 0.08);
            border: 1px dashed rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 32px;
        }}

        .code-label {{
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }}

        .code-value {{
            font-size: 32px;
            font-weight: 800;
            letter-spacing: 4px;
            color: #007AFF;
            font-family: 'Inter', monospace;
        }}

        .copy-btn {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 12px;
            background: rgba(0, 122, 255, 0.15);
            border: 1px solid rgba(0, 122, 255, 0.3);
            color: #007AFF;
            padding: 8px 20px;
            border-radius: 100px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }}

        .copy-btn:hover {{
            background: rgba(0, 122, 255, 0.25);
        }}

        .copy-btn:active {{
            transform: scale(0.95);
        }}

        .steps {{
            text-align: left;
            margin-bottom: 32px;
        }}

        .step {{
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 12px 0;
        }}

        .step-number {{
            width: 28px;
            height: 28px;
            min-width: 28px;
            background: linear-gradient(135deg, #007AFF, #5856D6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            margin-top: 1px;
        }}

        .step-text {{
            font-size: 15px;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.4;
        }}

        .step-text strong {{
            color: #fff;
        }}

        .download-buttons {{
            display: flex;
            flex-direction: column;
            gap: 12px;
        }}

        .download-btn {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px 24px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
            cursor: pointer;
        }}

        .download-btn:active {{
            transform: scale(0.98);
        }}

        .btn-ios {{
            background: #fff;
            color: #000;
        }}

        .btn-ios:hover {{
            background: #f0f0f0;
        }}

        .btn-android {{
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
        }}

        .btn-android:hover {{
            background: rgba(255, 255, 255, 0.15);
        }}

        .btn-icon {{
            font-size: 22px;
        }}

        .footer {{
            margin-top: 24px;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.3);
        }}

        .toast {{
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: #34C759;
            color: #fff;
            padding: 12px 24px;
            border-radius: 100px;
            font-size: 14px;
            font-weight: 600;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
            z-index: 100;
        }}

        .toast.show {{
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }}

        @media (max-width: 480px) {{
            .card {{
                padding: 36px 24px;
            }}
            h1 {{
                font-size: 24px;
            }}
            .code-value {{
                font-size: 26px;
                letter-spacing: 3px;
            }}
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="logo">🤝</div>
        <div class="badge">Convite exclusivo</div>
        <h1>{greeting} para a Rede de Embaixadores!</h1>
        <p class="subtitle">
            Faça parte da maior rede de mobilização política do Brasil.
            Ganhe pontos, complete missões e suba no ranking!
        </p>

        <div class="code-section">
            <div class="code-label">Seu código de convite</div>
            <div class="code-value" id="code">{referral_code}</div>
            <button class="copy-btn" onclick="copyCode()">
                <span id="copy-icon">📋</span>
                <span id="copy-text">Copiar código</span>
            </button>
        </div>

        <div class="steps">
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-text"><strong>Baixe o app</strong> usando os botões abaixo</div>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-text"><strong>Crie sua conta</strong> no app</div>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-text"><strong>Use o código</strong> <strong style="color: #007AFF">{referral_code}</strong> no campo "Código de Indicação"</div>
            </div>
        </div>

        <div class="download-buttons">
            <a href="#" class="download-btn btn-ios" id="btn-ios">
                <span class="btn-icon">🍎</span>
                Baixar na App Store
            </a>
            <a href="#" class="download-btn btn-android" id="btn-android">
                <span class="btn-icon">🤖</span>
                Baixar no Google Play
            </a>
        </div>

        <div class="footer">
            Rede de Embaixadores &copy; 2026
        </div>
    </div>

    <div class="toast" id="toast">✅ Código copiado!</div>

    <script>
        function copyCode() {{
            const code = document.getElementById('code').textContent;
            navigator.clipboard.writeText(code).then(() => {{
                const toast = document.getElementById('toast');
                toast.classList.add('show');
                document.getElementById('copy-icon').textContent = '✅';
                document.getElementById('copy-text').textContent = 'Copiado!';
                setTimeout(() => {{
                    toast.classList.remove('show');
                    document.getElementById('copy-icon').textContent = '📋';
                    document.getElementById('copy-text').textContent = 'Copiar código';
                }}, 2000);
            }});
        }}

        // Detect platform and highlight the right button
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        if (isIOS) {{
            document.getElementById('btn-ios').style.boxShadow = '0 4px 20px rgba(0,122,255,0.3)';
        }} else if (isAndroid) {{
            document.getElementById('btn-android').style.boxShadow = '0 4px 20px rgba(0,122,255,0.3)';
        }}
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

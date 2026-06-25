"""
═══════════════════════════════════════════════════════════════
  Static Pages — Support & Privacy Policy
  Public pages required by Apple App Store / Google Play
  Routes: /suporte, /privacidade
═══════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

# ═══════════════════════════════════════════════════════════════
#  SHARED STYLES (same brand as landing page)
# ═══════════════════════════════════════════════════════════════

_SHARED_HEAD = """
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#DC0000">

    <!-- FAVICON -->
    <link rel="icon" type="image/png" sizes="180x180" href="/static/icon-180.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/static/icon-180.png">
    <link rel="shortcut icon" href="/static/icon-180.png">

    <!-- TYPOGRAPHY -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --brand-red: #DC0000;
            --brand-red-dark: #B80000;
            --app-accent: #E33431;
            --bg-primary: #0A0A0F;
            --bg-surface: #1A1A24;
            --bg-elevated: #252530;
            --text-primary: #FFFFFF;
            --text-secondary: #A0A0AB;
            --text-tertiary: #6B6B78;
            --border-color: #32323E;
            --font-display: 'Montserrat', -apple-system, sans-serif;
            --font-body: 'Inter', -apple-system, sans-serif;
            --radius-lg: 20px;
            --radius-md: 14px;
            --space-xs: 6px;
            --space-sm: 10px;
            --space-md: 16px;
            --space-lg: 24px;
            --space-xl: 40px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: var(--font-body);
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            max-width: 720px;
            margin: 0 auto;
            padding: var(--space-lg);
        }

        /* HEADER */
        .page-header {
            text-align: center;
            padding: var(--space-xl) 0;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: var(--space-xl);
        }

        .logo-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
            text-decoration: none;
        }

        .logo-img {
            width: 56px;
            height: 56px;
            border-radius: 14px;
            box-shadow: 0 4px 16px rgba(220, 0, 0, 0.3);
        }

        .logo-text {
            font-family: var(--font-display);
            font-size: 22px;
            font-weight: 800;
            color: var(--text-primary);
        }

        .page-title {
            font-family: var(--font-display);
            font-size: 32px;
            font-weight: 900;
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }

        .page-subtitle {
            font-size: 16px;
            color: var(--text-secondary);
        }

        /* SECTIONS */
        .section {
            margin-bottom: var(--space-xl);
        }

        .section-title {
            font-family: var(--font-display);
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--space-md);
            padding-bottom: var(--space-sm);
            border-bottom: 2px solid var(--app-accent);
            display: inline-block;
        }

        .section p, .section li {
            color: var(--text-secondary);
            font-size: 15px;
            line-height: 1.8;
        }

        .section ul {
            list-style: none;
            padding: 0;
        }

        .section li {
            padding-left: 24px;
            position: relative;
            margin-bottom: var(--space-sm);
        }

        .section li::before {
            content: '›';
            position: absolute;
            left: 6px;
            color: var(--app-accent);
            font-weight: 700;
            font-size: 18px;
        }

        /* FAQ */
        .faq-item {
            background: var(--bg-surface);
            border-radius: var(--radius-md);
            margin-bottom: var(--space-md);
            overflow: hidden;
            border: 1px solid var(--border-color);
            transition: border-color 0.2s;
        }

        .faq-item:hover {
            border-color: var(--app-accent);
        }

        .faq-question {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            cursor: pointer;
            user-select: none;
            font-family: var(--font-display);
            font-weight: 700;
            font-size: 15px;
            color: var(--text-primary);
            background: none;
            border: none;
            width: 100%;
            text-align: left;
        }

        .faq-question:hover {
            background: var(--bg-elevated);
        }

        .faq-arrow {
            transition: transform 0.3s;
            color: var(--app-accent);
            font-size: 18px;
            flex-shrink: 0;
        }

        .faq-item.open .faq-arrow {
            transform: rotate(90deg);
        }

        .faq-answer {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s;
            padding: 0 var(--space-lg);
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.8;
        }

        .faq-item.open .faq-answer {
            max-height: 500px;
            padding: 0 var(--space-lg) var(--space-md);
        }

        /* CONTACT CARD */
        .contact-card {
            background: linear-gradient(135deg, var(--bg-surface), var(--bg-elevated));
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            border: 1px solid var(--border-color);
            text-align: center;
        }

        .contact-card h3 {
            font-family: var(--font-display);
            font-size: 18px;
            font-weight: 700;
            margin-bottom: var(--space-sm);
        }

        .contact-card p {
            color: var(--text-secondary);
            font-size: 14px;
            margin-bottom: var(--space-md);
        }

        .contact-email {
            display: inline-flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md) var(--space-lg);
            background: var(--app-accent);
            color: #fff;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 700;
            font-size: 15px;
            transition: filter 0.2s, transform 0.2s;
        }

        .contact-email:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }

        /* FOOTER */
        .page-footer {
            text-align: center;
            padding: var(--space-xl) 0 var(--space-lg);
            border-top: 1px solid var(--border-color);
            margin-top: var(--space-xl);
        }

        .page-footer p {
            color: var(--text-tertiary);
            font-size: 13px;
        }

        .page-footer a {
            color: var(--app-accent);
            text-decoration: none;
        }

        .page-footer a:hover {
            text-decoration: underline;
        }

        .footer-links {
            display: flex;
            justify-content: center;
            gap: var(--space-lg);
            margin-bottom: var(--space-md);
            flex-wrap: wrap;
        }
    </style>
"""


# ═══════════════════════════════════════════════════════════════
#  SUPPORT PAGE
# ═══════════════════════════════════════════════════════════════

@router.get("/suporte", response_class=HTMLResponse, include_in_schema=False)
async def support_page():
    """Public support page for Apple App Store / Google Play compliance."""
    return HTMLResponse(content=f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    {_SHARED_HEAD}
    <title>Suporte — Embaixadores</title>
    <meta name="description" content="Central de suporte do app Embaixadores. Dúvidas, problemas técnicos e contato.">
</head>
<body>
    <div class="container">

        <!-- HEADER -->
        <header class="page-header">
            <a href="/" class="logo-row" aria-label="Voltar ao início">
                <img src="/static/icon.png" alt="Embaixadores" class="logo-img" width="56" height="56">
                <span class="logo-text">Embaixadores</span>
            </a>
            <h1 class="page-title">Central de Suporte</h1>
            <p class="page-subtitle">Encontre respostas ou entre em contato conosco</p>
        </header>

        <!-- FAQ -->
        <section class="section">
            <h2 class="section-title">❓ Perguntas Frequentes</h2>

            <div class="faq-item open">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    Como faço para criar minha conta?
                </button>
                <div class="faq-answer">
                    Baixe o app Embaixadores na App Store ou Google Play. Você pode se cadastrar usando seu e-mail, conta Google ou Apple. Preencha seus dados e aceite os termos de uso. Pronto!
                </div>
            </div>

            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    Como uso um código de convite?
                </button>
                <div class="faq-answer">
                    Se você recebeu um link de convite, clique nele e o app abrirá automaticamente com o código preenchido. Basta clicar em "Validar". Se preferir, vá em <strong>Perfil</strong> e insira o código manualmente na seção "Código de Indicação".
                </div>
            </div>

            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    Como ganho pontos e subo de nível?
                </button>
                <div class="faq-answer">
                    Complete missões disponíveis na aba <strong>Missões</strong>. Cada missão concluída dá pontos. Ao acumular pontos suficientes, você sobe de nível automaticamente — de Apoiador para Mobilizador, Líder, Coordenador e Embaixador.
                </div>
            </div>

            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    Esqueci minha senha. O que faço?
                </button>
                <div class="faq-answer">
                    Na tela de login, toque em <strong>"Esqueci minha senha"</strong>. Informe seu e-mail cadastrado e enviaremos um link para redefinição. Verifique também a pasta de spam.
                </div>
            </div>

            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    Como convidar amigos para a rede?
                </button>
                <div class="faq-answer">
                    Acesse a aba <strong>Convites</strong> e compartilhe seu código ou link pessoal via WhatsApp, redes sociais ou qualquer canal. Quando alguém se cadastrar usando seu código, você ganha pontos extras!
                </div>
            </div>

            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    O app é gratuito?
                </button>
                <div class="faq-answer">
                    Sim! O app Embaixadores é 100% gratuito. Não há compras dentro do app nem assinaturas.
                </div>
            </div>

            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    Como excluo minha conta e meus dados?
                </button>
                <div class="faq-answer">
                    Você pode solicitar a exclusão da sua conta acessando <strong>Perfil → Configurações → Excluir minha conta</strong>. Todos os seus dados pessoais serão removidos em até 30 dias, conforme a LGPD. Você também pode solicitar a exclusão pelo e-mail de suporte.
                </div>
            </div>

            <div class="faq-item">
                <button class="faq-question" onclick="toggleFaq(this)">
                    <span class="faq-arrow">›</span>
                    O app funciona offline?
                </button>
                <div class="faq-answer">
                    O app requer conexão com a internet para a maioria das funcionalidades, como completar missões, atualizar ranking e sincronizar dados. Algumas informações ficam em cache para visualização rápida.
                </div>
            </div>
        </section>

        <!-- CONTACT -->
        <section class="section">
            <h2 class="section-title">📬 Fale Conosco</h2>
            <div class="contact-card">
                <h3>Não encontrou sua resposta?</h3>
                <p>Nossa equipe está pronta para ajudar. Envie um e-mail e responderemos em até 48 horas úteis.</p>
                <a href="mailto:suporte@embaixadores.app" class="contact-email">
                    ✉️ suporte@embaixadores.app
                </a>
            </div>
        </section>

        <!-- USEFUL INFO -->
        <section class="section">
            <h2 class="section-title">ℹ️ Informações Úteis</h2>
            <ul>
                <li>Versão atual do app: <strong>1.0.0</strong></li>
                <li>Compatível com iOS 15+ e Android 10+</li>
                <li>Seus dados são protegidos conforme a <a href="/privacidade" style="color: var(--app-accent);">Política de Privacidade</a></li>
                <li>Para problemas urgentes, inclua capturas de tela no e-mail</li>
            </ul>
        </section>

        <!-- FOOTER -->
        <footer class="page-footer">
            <div class="footer-links">
                <a href="/privacidade">Política de Privacidade</a>
                <a href="/suporte">Suporte</a>
                <a href="/csae">Proteção Infantil</a>
            </div>
            <p>© 2026 Embaixadores. Todos os direitos reservados.</p>
        </footer>
    </div>

    <script>
        function toggleFaq(btn) {{
            const item = btn.parentElement;
            const wasOpen = item.classList.contains('open');
            // Close all
            document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('open'));
            // Toggle clicked
            if (!wasOpen) item.classList.add('open');
        }}
    </script>
</body>
</html>""")


# ═══════════════════════════════════════════════════════════════
#  PRIVACY POLICY PAGE
# ═══════════════════════════════════════════════════════════════

@router.get("/privacidade", response_class=HTMLResponse, include_in_schema=False)
async def privacy_page():
    """Public privacy policy page for Apple App Store / Google Play compliance."""
    return HTMLResponse(content=f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    {_SHARED_HEAD}
    <title>Política de Privacidade — Embaixadores</title>
    <meta name="description" content="Política de Privacidade do app Embaixadores. Saiba como coletamos, usamos e protegemos seus dados.">
</head>
<body>
    <div class="container">

        <!-- HEADER -->
        <header class="page-header">
            <a href="/" class="logo-row" aria-label="Voltar ao início">
                <img src="/static/icon.png" alt="Embaixadores" class="logo-img" width="56" height="56">
                <span class="logo-text">Embaixadores</span>
            </a>
            <h1 class="page-title">Política de Privacidade</h1>
            <p class="page-subtitle">Última atualização: 09 de junho de 2026</p>
        </header>

        <section class="section">
            <h2 class="section-title">1. Informações que Coletamos</h2>
            <p>Ao utilizar o app Embaixadores, podemos coletar os seguintes dados:</p>
            <ul>
                <li><strong>Dados de cadastro:</strong> nome completo, e-mail, telefone (opcional) e senha</li>
                <li><strong>Dados de perfil:</strong> foto (opcional), cidade, estado e biografia</li>
                <li><strong>Dados de uso:</strong> missões completadas, pontuação, nível, badges e histórico de atividades</li>
                <li><strong>Dados de autenticação social:</strong> quando você usa login Google ou Apple, recebemos seu nome e e-mail associados à conta</li>
                <li><strong>Dados técnicos:</strong> tipo de dispositivo, sistema operacional e versão do app</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">2. Como Usamos seus Dados</h2>
            <p>Utilizamos seus dados para:</p>
            <ul>
                <li>Criar e manter sua conta no app</li>
                <li>Gerenciar a gamificação (pontos, níveis, ranking e badges)</li>
                <li>Enviar notificações sobre missões, eventos e atualizações</li>
                <li>Melhorar a experiência do app e corrigir problemas</li>
                <li>Gerar estatísticas anônimas de uso</li>
                <li>Cumprir obrigações legais</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">3. Compartilhamento de Dados</h2>
            <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins comerciais. Seus dados podem ser compartilhados apenas nas seguintes situações:</p>
            <ul>
                <li><strong>Ranking público:</strong> se você consentir, seu nome e pontuação podem aparecer no ranking para outros participantes</li>
                <li><strong>Provedores de serviço:</strong> utilizamos o Supabase como infraestrutura de banco de dados e autenticação, com criptografia de dados em trânsito e em repouso</li>
                <li><strong>Obrigações legais:</strong> quando exigido por lei ou ordem judicial</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">4. Segurança dos Dados</h2>
            <p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
            <ul>
                <li>Senhas armazenadas com hash criptográfico (nunca em texto puro)</li>
                <li>Comunicação via HTTPS com criptografia TLS</li>
                <li>Autenticação via tokens JWT com expiração</li>
                <li>Acesso restrito ao banco de dados por permissões de serviço</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">5. Seus Direitos (LGPD)</h2>
            <p>Conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem direito a:</p>
            <ul>
                <li><strong>Acesso:</strong> saber quais dados temos sobre você</li>
                <li><strong>Correção:</strong> atualizar dados incorretos ou incompletos</li>
                <li><strong>Exclusão:</strong> solicitar a remoção dos seus dados pessoais</li>
                <li><strong>Revogação:</strong> retirar seu consentimento a qualquer momento</li>
                <li><strong>Portabilidade:</strong> solicitar seus dados em formato estruturado</li>
            </ul>
            <p style="margin-top: var(--space-md);">Para exercer qualquer direito, entre em contato pelo e-mail <a href="mailto:suporte@embaixadores.app" style="color: var(--app-accent);">suporte@embaixadores.app</a>.</p>
        </section>

        <section class="section">
            <h2 class="section-title">6. Retenção de Dados</h2>
            <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após a exclusão da conta, seus dados pessoais serão removidos em até 30 dias. Dados anonimizados e estatísticos podem ser mantidos por tempo indeterminado.</p>
        </section>

        <section class="section">
            <h2 class="section-title">7. Cookies e Tecnologias</h2>
            <p>O app não utiliza cookies. Armazenamos apenas tokens de autenticação localmente no dispositivo para manter sua sessão ativa. Nenhum rastreador de terceiros é utilizado.</p>
        </section>

        <section class="section">
            <h2 class="section-title">8. Alterações nesta Política</h2>
            <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas por meio do app. O uso continuado do app após alterações constitui aceitação da nova política.</p>
        </section>

        <section class="section">
            <h2 class="section-title">9. Contato</h2>
            <div class="contact-card">
                <h3>Dúvidas sobre Privacidade?</h3>
                <p>Entre em contato com nosso encarregado de proteção de dados.</p>
                <a href="mailto:suporte@embaixadores.app" class="contact-email">
                    ✉️ suporte@embaixadores.app
                </a>
            </div>
        </section>

        <!-- FOOTER -->
        <footer class="page-footer">
            <div class="footer-links">
                <a href="/privacidade">Política de Privacidade</a>
                <a href="/suporte">Suporte</a>
                <a href="/csae">Proteção Infantil</a>
            </div>
            <p>© 2026 Embaixadores. Todos os direitos reservados.</p>
        </footer>
    </div>
</body>
</html>""")


@router.get("/csae", response_class=HTMLResponse, include_in_schema=False)
async def csae_page():
    """Public CSAE (Child Sexual Abuse & Exploitation) standards page for Google Play compliance."""
    return HTMLResponse(content=f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    {_SHARED_HEAD}
    <title>Padrões contra Abuso e Exploração Sexual Infantil — Embaixadores</title>
    <meta name="description" content="Política e padrões do app Embaixadores contra abuso e exploração sexual infantil (CSAE).">
</head>
<body>
    <div class="container">

        <!-- HEADER -->
        <header class="page-header">
            <a href="/" class="logo-row" aria-label="Voltar ao início">
                <img src="/static/icon.png" alt="Embaixadores" class="logo-img" width="56" height="56">
                <span class="logo-text">Embaixadores</span>
            </a>
            <h1 class="page-title">Padrões contra Abuso e Exploração Sexual Infantil (CSAE)</h1>
            <p class="page-subtitle">Última atualização: 25 de junho de 2026</p>
        </header>

        <section class="section">
            <h2 class="section-title">1. Nosso Compromisso</h2>
            <p>O app <strong>Embaixadores</strong> tem tolerância zero com qualquer forma de abuso e exploração sexual infantil (CSAE — <em>Child Sexual Abuse and Exploitation</em>). Estamos comprometidos em proteger crianças e adolescentes de qualquer conteúdo, conduta ou interação que possa representar risco à sua segurança e bem-estar.</p>
            <p>Esta política se aplica a todos os usuários da plataforma, sem exceção, e está em conformidade com:</p>
            <ul>
                <li><strong>Estatuto da Criança e do Adolescente (ECA)</strong> — Lei nº 8.069/1990</li>
                <li><strong>Lei nº 11.829/2008</strong> — Combate à pornografia infantil</li>
                <li><strong>Marco Civil da Internet</strong> — Lei nº 12.965/2014</li>
                <li><strong>Políticas do Google Play</strong> para proteção infantil</li>
                <li><strong>Convenção sobre os Direitos da Criança</strong> (ONU)</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">2. Conteúdo Proibido</h2>
            <p>É estritamente proibido no app Embaixadores:</p>
            <ul>
                <li>Criar, compartilhar, distribuir ou armazenar qualquer material de abuso sexual infantil (CSAM)</li>
                <li>Solicitar, facilitar ou promover qualquer forma de exploração sexual de menores</li>
                <li>Utilizar a plataforma para aliciar, recrutar ou fazer <em>grooming</em> de menores</li>
                <li>Compartilhar conteúdo sexualmente sugestivo envolvendo menores de 18 anos</li>
                <li>Criar perfis falsos com o objetivo de interagir inadequadamente com menores</li>
                <li>Enviar mensagens, convites ou conteúdos inapropriados direcionados a menores</li>
                <li>Qualquer outra conduta que coloque em risco a segurança de crianças e adolescentes</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">3. Medidas de Proteção</h2>
            <p>Adotamos as seguintes medidas para garantir a segurança de menores em nossa plataforma:</p>
            <ul>
                <li><strong>Moderação de conteúdo:</strong> todo conteúdo compartilhado na plataforma é revisado por nossa equipe de moderação</li>
                <li><strong>Restrição de idade:</strong> o app é destinado a maiores de 18 anos</li>
                <li><strong>Denúncia facilitada:</strong> disponibilizamos canal direto para denúncia de conteúdo ou comportamento inadequado</li>
                <li><strong>Ação imediata:</strong> contas que violem esta política são suspensas ou removidas imediatamente, sem aviso prévio</li>
                <li><strong>Cooperação com autoridades:</strong> denunciamos qualquer caso identificado às autoridades competentes, incluindo a Polícia Federal e o Ministério Público</li>
                <li><strong>Preservação de evidências:</strong> dados relevantes são preservados para investigação das autoridades conforme exigido por lei</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">4. Como Denunciar</h2>
            <p>Se você identificar qualquer conteúdo ou comportamento que viole esta política, denuncie imediatamente:</p>
            <ul>
                <li><strong>No app:</strong> utilize o botão de denúncia disponível em perfis e conteúdos</li>
                <li><strong>Por e-mail:</strong> envie sua denúncia para <a href="mailto:suporte@embaixadores.app" style="color: var(--app-accent);">suporte@embaixadores.app</a> com o assunto "Denúncia CSAE"</li>
                <li><strong>Canais externos:</strong></li>
            </ul>
            <ul>
                <li><a href="https://new.safernet.org.br/denuncie" style="color: var(--app-accent);" target="_blank" rel="noopener">SaferNet Brasil</a> — Canal de denúncia de crimes contra direitos humanos na internet</li>
                <li><a href="tel:100" style="color: var(--app-accent);">Disque 100</a> — Canal nacional de denúncias de violações de direitos humanos</li>
                <li><strong>Polícia Federal:</strong> para denúncias de pornografia infantil na internet</li>
            </ul>
            <p style="margin-top: var(--space-md);">Todas as denúncias são tratadas com sigilo e prioridade máxima.</p>
        </section>

        <section class="section">
            <h2 class="section-title">5. Consequências</h2>
            <p>Violações a esta política resultarão em:</p>
            <ul>
                <li><strong>Remoção imediata</strong> de todo conteúdo ilegal ou inadequado</li>
                <li><strong>Suspensão ou banimento permanente</strong> da conta do infrator</li>
                <li><strong>Notificação às autoridades competentes</strong> (Polícia Federal, Ministério Público, Conselho Tutelar)</li>
                <li><strong>Preservação de dados</strong> para fins de investigação criminal</li>
                <li><strong>Cooperação irrestrita</strong> com investigações policiais e judiciais</li>
            </ul>
        </section>

        <section class="section">
            <h2 class="section-title">6. Ponto de Contato</h2>
            <div class="contact-card">
                <h3>Canal de Denúncia CSAE</h3>
                <p>Para denúncias relacionadas à segurança infantil, entre em contato imediatamente.</p>
                <a href="mailto:suporte@embaixadores.app" class="contact-email">
                    ✉️ suporte@embaixadores.app
                </a>
                <p style="margin-top: var(--space-sm); font-size: 0.9rem; opacity: 0.8;">As denúncias são analisadas em até 24 horas e encaminhadas às autoridades quando necessário.</p>
            </div>
        </section>

        <!-- FOOTER -->
        <footer class="page-footer">
            <div class="footer-links">
                <a href="/privacidade">Política de Privacidade</a>
                <a href="/suporte">Suporte</a>
                <a href="/csae">Proteção Infantil</a>
            </div>
            <p>© 2026 Embaixadores. Todos os direitos reservados.</p>
        </footer>
    </div>
</body>
</html>""")

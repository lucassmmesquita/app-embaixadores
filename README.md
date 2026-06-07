# Rede de Embaixadores

**Plataforma digital de mobilização política com gamificação.**

Transforma apoiadores em agentes ativos de participação cidadã por meio de missões, níveis, badges e uma comunidade engajada.

---

## Arquitetura

```
app-rede-embaixadores/
├── app/              # App Mobile — React Native + Expo SDK 52
├── backend/          # API REST — Python + FastAPI
├── web/              # Portal Admin — Next.js 15 (futuro)
├── supabase/         # SQL migrations e seeds
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
├── design-system-inacio.md   # Design system documentado
├── render.yaml       # Configuração de deploy no Render
├── deploy.sh         # Script de deploy
└── GEMINI.md         # Instruções para o agente AI
```

---

## Stack Técnica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Mobile** | React Native + Expo | SDK 52 |
| **Backend** | Python + FastAPI | 3.12+ / 0.115+ |
| **ORM** | SQLAlchemy (Async) | 2.0 |
| **Auth** | Supabase Auth (JWT ES256) | — |
| **Database** | PostgreSQL via Supabase | 15+ |
| **Ícones** | MaterialIcons (@expo/vector-icons) | 15.1 |
| **State** | Zustand | 5.0 |
| **Deploy API** | Render (Python Native) | — |
| **Design** | Design System Inácio Arruda | v0.1 |

---

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9 (gerenciador de pacotes JS)
- Python >= 3.12
- Conta Supabase (banco + auth)
- Expo Go no celular (para testar o app)

---

## Setup Local

### 1. Clone o repositório

```bash
git clone https://github.com/lucassmmesquita/app-embaixadores.git
cd app-embaixadores
```

### 2. Backend (API)

```bash
cd backend

# Criar virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com as credenciais (ver seção "Variáveis de Ambiente")

# Rodar servidor local
uvicorn src.main:app --reload --port 8000
```

**API Docs:** http://localhost:8000/docs

### 3. App Mobile

```bash
cd app

# Instalar dependências (usar pnpm obrigatoriamente)
npx pnpm install

# Iniciar Expo
npx expo start
```

Escaneie o QR Code com o Expo Go no celular.

### 4. Database

Execute as migrations no **Supabase SQL Editor** na ordem:

1. `supabase/migrations/001_initial_schema.sql` — Schema completo
2. `supabase/migrations/002_rls_policies.sql` — Row Level Security
3. `supabase/migrations/003_seed_data.sql` — Dados iniciais (níveis, categorias, badges)

---

## Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL (PgBouncer) | `postgresql://user:pass@host:6543/postgres` |
| `SUPABASE_URL` | URL do projeto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin do Supabase (cuidado!) | `eyJ...` |
| `SUPABASE_JWT_SECRET` | JWT secret do Supabase | `If//wC3...` |
| `API_SECRET_KEY` | Secret local para tokens HS256 | qualquer string segura |
| `API_ENVIRONMENT` | `development` ou `production` | `production` |
| `API_DEBUG` | Ativa logs detalhados | `true` / `false` |
| `API_CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | `http://localhost:3000,...` |

### App Mobile (`app/services/api.ts`)

A URL da API está definida no arquivo `app/services/api.ts`. Para produção, aponta para `https://app-embaixadores.onrender.com/api/v1`.

---

## Módulos da API

| Módulo | Rota Base | Descrição |
|--------|-----------|-----------|
| **Auth** | `/api/v1/auth` | Login, registro, tokens JWT |
| **Users** | `/api/v1/users` | Perfil, stats, ranking |
| **Missions** | `/api/v1/missions` | CRUD de missões, iniciar/completar |
| **Gamification** | `/api/v1/gamification` | Níveis, badges, leaderboard |
| **Events** | `/api/v1/events` | Eventos, inscrição, check-in |
| **Content** | `/api/v1/content` | Materiais de campanha |
| **Notifications** | `/api/v1/notifications` | Notificações push |
| **Admin** | `/api/v1/admin` | Painel administrativo |

---

## Autenticação

O sistema usa **Supabase Auth** com tokens JWT assinados em **ES256**.

### Fluxo:
1. `POST /api/v1/auth/login` → Supabase autentica → retorna `access_token`
2. Client envia `Authorization: Bearer <token>` em todas as requisições
3. Backend verifica o token via **JWKS** (chaves públicas do Supabase)
4. Fallback para HS256 com `SUPABASE_JWT_SECRET`

### Arquivo de segurança:
`backend/src/core/security.py` — busca JWKS de `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`

### Usuário de teste:
- **Email:** `lucas.embaixador@gmail.com`
- **Senha:** `Embaixador2024!`

---

## Design System

O app segue o **Design System Inácio Arruda** documentado em [`design-system-inacio.md`](design-system-inacio.md).

### Paleta Principal

| Cor | Hex | Uso |
|-----|-----|-----|
| Azul | `#2171BA` | Primary — botões, navegação, confiança |
| Vermelho | `#E33431` | Accent — energia, urgência, CTAs |
| Verde | `#4DAA35` | Success — esperança, conquistas |
| Amarelo | `#FAD549` | Warning — otimismo, destaque |

### Regras:
- **Ícones:** MaterialIcons (`@expo/vector-icons`) — sem emojis
- **Botões:** `borderRadius: 999` (pill shape)
- **ColorBar:** Barra horizontal vermelho/amarelo/verde/azul como assinatura visual
- **Tipografia:** SF Pro (iOS) / Roboto (Android) nativas — pesos 700-800 para títulos

---

## Telas do App

| Tela | Arquivo | Descrição |
|------|---------|-----------|
| Login | `app/(auth)/login.tsx` | Autenticação com email/senha |
| Registro | `app/(auth)/register.tsx` | Cadastro de novo usuário |
| Onboarding | `app/(auth)/onboarding.tsx` | 4 slides de boas-vindas |
| Home | `app/(tabs)/home.tsx` | Dashboard com stats e missões |
| Missões | `app/(tabs)/missions.tsx` | Lista de missões filtráveis |
| Ranking | `app/(tabs)/ranking.tsx` | Leaderboard com pódio top 3 |
| Eventos | `app/(tabs)/events.tsx` | Lista de eventos por data |
| Perfil | `app/(tabs)/profile.tsx` | Dados do usuário e menu |
| Missão Detalhe | `app/mission/[id].tsx` | Detalhe e iniciar missão |
| Evento Detalhe | `app/event/[id].tsx` | Detalhe, inscrição e check-in |
| Materiais | `app/content/index.tsx` | Biblioteca de conteúdo |
| Material Detalhe | `app/content/[id].tsx` | Visualizar e compartilhar |

---

## Sistema de Gamificação

| Nível | Pontos | Cor |
|-------|--------|-----|
| Apoiador | 0 – 999 | Verde `#4DAA35` |
| Mobilizador | 1.000 – 2.999 | Azul `#399BD8` |
| Líder | 3.000 – 6.999 | Amarelo `#FAD549` |
| Embaixador | 7.000 – 14.999 | Vermelho `#E33431` |
| Coordenador de Rede | 15.000+ | Roxo `#7A3F8F` |

---

## Deploy

### Backend (Render)

O backend está deployado no Render como **Python Native** (não Docker, devido ao Free Tier):

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- **URL:** https://app-embaixadores.onrender.com
- **Docs:** https://app-embaixadores.onrender.com/docs

Variáveis de ambiente configuradas no painel do Render (ver seção acima).

### Notas importantes sobre PgBouncer

O Supabase usa PgBouncer em modo transaction. O SQLAlchemy precisa de configuração especial:

```python
# backend/src/core/database.py
engine = create_async_engine(
    DATABASE_URL,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)
```

---

## Estrutura de Arquivos Importantes

```
backend/
├── src/
│   ├── main.py                    # Entry point FastAPI
│   ├── core/
│   │   ├── config.py              # Variáveis de ambiente (Pydantic Settings)
│   │   ├── database.py            # SQLAlchemy async engine
│   │   └── security.py            # JWT verification (JWKS + HS256)
│   └── modules/
│       ├── auth/
│       │   ├── router.py          # POST /login, /register
│       │   └── service.py         # Supabase auth integration
│       ├── users/
│       │   ├── models.py          # Profile SQLAlchemy model
│       │   ├── router.py          # GET /me, /stats
│       │   └── schemas.py         # Pydantic schemas
│       ├── missions/              # Missões CRUD
│       ├── gamification/          # Níveis, badges, leaderboard
│       ├── events/                # Eventos, check-in
│       ├── content/               # Materiais de campanha
│       ├── notifications/         # Push notifications
│       └── admin/                 # Painel admin
├── requirements.txt
└── .env

app/
├── app/
│   ├── _layout.tsx                # Root layout (auth guard)
│   ├── (auth)/                    # Telas de autenticação
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/                    # Telas com tab bar
│   │   ├── _layout.tsx            # Tab navigation + ColorBar
│   │   ├── home.tsx
│   │   ├── missions.tsx
│   │   ├── ranking.tsx
│   │   ├── events.tsx
│   │   └── profile.tsx
│   ├── mission/[id].tsx           # Detalhe da missão
│   ├── event/[id].tsx             # Detalhe do evento
│   └── content/
│       ├── index.tsx              # Biblioteca de materiais
│       └── [id].tsx               # Detalhe do material
├── components/
│   └── ui/
│       └── ColorBar.tsx           # Barra de cores institucional
├── constants/
│   └── theme.ts                   # Design tokens (cores, tipografia, spacing)
├── services/
│   └── api.ts                     # HTTP client (fetch wrapper)
├── stores/
│   └── authStore.ts               # Zustand auth state
└── package.json
```

---

## Próximos Passos

- [ ] Implementar login com Apple e Google (Supabase OAuth)
- [ ] Portal Admin Web (Next.js em `/web`)
- [ ] Push notifications (Expo Notifications)
- [ ] Upload de foto de perfil
- [ ] Sistema de indicação (referral tracking)
- [ ] Modo offline com sync

---

## Licença

Propriedade privada — todos os direitos reservados.

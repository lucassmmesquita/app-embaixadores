# 🏛️ Rede de Embaixadores

**Plataforma digital de mobilização política com gamificação**

Transforma apoiadores em agentes ativos de participação cidadã por meio de missões, níveis, badges e uma comunidade engajada.

---

## 📋 Arquitetura

```
app-embaixadores/
├── backend/      🐍 Backend FastAPI (Python 3.12)
├── web/          🌐 Portal Admin Next.js 15
├── app/          📱 App React Native + Expo
├── packages/
│   └── shared-types/  📦 TypeScript types compartilhados
├── supabase/     🗄️ SQL migrations e seeds
└── .github/      🔄 CI/CD workflows
```

## 🚀 Quick Start

### Pré-requisitos
- Node.js >= 20
- pnpm >= 9
- Python >= 3.12
- uv (Python package manager)
- Docker (opcional, para local dev)

### Setup

```bash
# Clone
git clone https://github.com/lucassmmesquita/app-embaixadores.git
cd app-embaixadores

# Instalar dependências JS
pnpm install

# Setup backend
cd backend
uv sync
cd ..

# Copiar env
cp .env.example .env
# Editar .env com suas credenciais

# Rodar tudo
pnpm dev
```

### Backend API

```bash
cd backend
uv run uvicorn src.main:app --reload --port 8000
```

API Docs: http://localhost:8000/docs

### Portal Web

```bash
cd web
pnpm dev
```

### App Mobile

```bash
cd app
pnpm start
```

## 🗄️ Database

Execute as migrations no Supabase SQL Editor:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_seed_data.sql`

## 🎮 Sistema de Gamificação

| Nível | Pontos | Cor |
|---|---|---|
| Apoiador | 0 - 99 | 🔵 Azul |
| Embaixador | 100 - 499 | 🟢 Verde |
| Mobilizador | 500 - 1.499 | 🟡 Amarelo |
| Líder Comunitário | 1.500 - 4.999 | 🟠 Laranja |
| Coordenador de Rede | 5.000+ | 🔴 Vermelho |

## 📦 Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Supabase
- **Web**: Next.js 15, Tailwind CSS v4, shadcn/ui
- **Mobile**: React Native, Expo SDK 52, NativeWind
- **Database**: PostgreSQL (Supabase)
- **Deploy**: Render (API), Vercel (Web), EAS (Mobile)

## 📄 Licença

Propriedade privada — todos os direitos reservados.

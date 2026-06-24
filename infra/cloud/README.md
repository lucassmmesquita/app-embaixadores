# Guia de Deploy — Cloud Providers

## Estrutura de Infraestrutura

```
infra/
├── docker/
│   ├── backend/
│   │   ├── Dockerfile.dev    ← Desenvolvimento (hot-reload)
│   │   └── Dockerfile.prod   ← Produção (gunicorn, multi-stage)
│   ├── admin/
│   │   ├── Dockerfile.dev    ← Desenvolvimento (Next.js dev server)
│   │   └── Dockerfile.prod   ← Produção (standalone, multi-stage)
├── compose/
│   ├── docker-compose.dev.yml   ← Dev local completo
│   └── docker-compose.prod.yml  ← Prod local (para testes)
├── env/
│   ├── .env.dev.example
│   └── .env.prod.example
└── cloud/
    └── README.md   ← Este arquivo
```

---

## Desenvolvimento Local

```bash
# Subir tudo com hot-reload (backend + admin + postgres)
docker compose -f infra/compose/docker-compose.dev.yml up

# Rebuild após alterar dependências (requirements.txt ou package.json)
docker compose -f infra/compose/docker-compose.dev.yml up --build
```

---

## Render

O `render.yaml` na raiz do repositório configura o deploy automático.

**Backend:**
- Dockerfile: `infra/docker/backend/Dockerfile.prod`
- Context: raiz do repo (`.`)
- Variáveis: configuradas no dashboard do Render

**Admin:**
- Pode ser deployado como segundo serviço no Render ou via Vercel

---

## AWS (ECS / Fargate)

1. Faça build e push das imagens:
```bash
# Backend
docker build -f infra/docker/backend/Dockerfile.prod -t embaixadores-api .
docker tag embaixadores-api:latest <account>.dkr.ecr.<region>.amazonaws.com/embaixadores-api:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/embaixadores-api:latest

# Admin
docker build -f infra/docker/admin/Dockerfile.prod -t embaixadores-admin \
  --build-arg NEXT_PUBLIC_API_URL=https://api.embaixadores.com .
docker tag embaixadores-admin:latest <account>.dkr.ecr.<region>.amazonaws.com/embaixadores-admin:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/embaixadores-admin:latest
```

2. Configure Task Definitions no ECS com as env vars de `infra/env/.env.prod.example`
3. Configure o ALB (Application Load Balancer) para rotear tráfego

---

## GCP (Cloud Run)

```bash
# Backend
gcloud builds submit --tag gcr.io/<project>/embaixadores-api \
  --file infra/docker/backend/Dockerfile.prod .

gcloud run deploy embaixadores-api \
  --image gcr.io/<project>/embaixadores-api \
  --port 8000 \
  --set-env-vars "$(cat .env.prod | tr '\n' ',')"

# Admin
gcloud builds submit --tag gcr.io/<project>/embaixadores-admin \
  --file infra/docker/admin/Dockerfile.prod \
  --build-arg NEXT_PUBLIC_API_URL=https://api.embaixadores.com .

gcloud run deploy embaixadores-admin \
  --image gcr.io/<project>/embaixadores-admin \
  --port 3002
```

---

## Variáveis de Ambiente

Copie o template apropriado e preencha com valores reais:

```bash
# Dev
cp infra/env/.env.dev.example backend/.env.docker

# Prod
cp infra/env/.env.prod.example .env.prod
```

> ⚠️ NUNCA commite arquivos `.env` com credenciais reais!

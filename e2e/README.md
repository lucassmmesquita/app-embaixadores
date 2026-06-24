# E2E Tests — App Embaixadores

Testes end-to-end usando [Playwright](https://playwright.dev) rodando em **container Docker** (nada instalado na máquina).

## Pré-requisitos

- Docker Desktop instalado e rodando

## Comandos

```bash
cd e2e

# Primeiro uso: build da imagem Docker
npm run install

# Rodar testes contra STAGING (padrão)
npm test

# Rodar testes contra ambiente LOCAL
npm run test:local

# Rodar testes contra staging (explícito)
npm run test:staging

# Ver relatório HTML após os testes
npm run report
```

## Testar com usuário específico

```bash
# Via env vars
TEST_USER_EMAIL=meu@email.com TEST_USER_PASSWORD=minhaSenha npm test
```

Ou crie um `.env` baseado no `.env.example`:
```bash
cp .env.example .env
# Edite o .env com seus dados
```

## Estrutura

```
e2e/
├── Dockerfile              # Imagem Playwright (browsers inclusos)
├── docker-compose.yml      # Orquestração do container
├── playwright.config.ts    # Configuração do Playwright
├── fixtures/
│   └── helpers.ts          # Seletores e utilitários reutilizáveis
├── tests/
│   └── auth/
│       ├── register.spec.ts  # Testes de cadastro
│       └── login.spec.ts     # Testes de login
└── test-results/           # Screenshots, vídeos, relatórios (gitignored)
```

## Adicionar novos testes

1. Crie um arquivo `.spec.ts` dentro de `tests/`
2. Use os seletores do `fixtures/helpers.ts`
3. Rode `npm test` para validar

## Troubleshooting

- **Testes falhando por timeout**: O Render free tier pode demorar ~30s para acordar. Abra o staging no browser antes de rodar os testes.
- **Container não builda**: Rode `docker compose build --no-cache playwright`

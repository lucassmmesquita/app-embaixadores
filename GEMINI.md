# Instruções do Projeto — Rede de Embaixadores

## ⚠️ REGRA CRÍTICA: Proteção de Memória do macOS

Este Mac possui **18 GB de RAM**. O sistema já travou DUAS VEZES por esgotamento de memória causado pelo agente.

### Regras Obrigatórias (NUNCA violar):

1. **ANTES de qualquer `npm install`, `pnpm install`, `pip install`, ou `npx expo`**:
   - Rodar `memory_pressure | head -3` para verificar memória disponível
   - Se "System-wide memory free percentage" for < 30%, NÃO executar o comando
   - Verificar no repositorio remoto se há atualizações e atualizar o codigo local antes de executar o comando de commit.
   - Avisar o usuário para fechar aplicativos primeiro

2. **NUNCA executar estes comandos em paralelo ou sequência rápida**:
   - `npm install` / `pnpm install`
   - `pip install`
   - `npx expo start` / `npx expo export`
   - Builds ou compilações pesadas
   - Sempre esperar um terminar COMPLETAMENTE antes de iniciar o próximo

3. **SEMPRE matar processos background antes de iniciar novos**:
   - Antes de `pip install`: verificar se há Metro/Expo rodando e matar
   - Antes de `npm install`: verificar se há servidores dev rodando e matar
   - Usar `manage_task` para listar e matar tarefas background

4. **Limitar output de comandos**:
   - Sempre usar `| tail -20` ou `| head -20` em comandos que geram muito output
   - NUNCA rodar `npm install` sem `2>&1 | tail -20`

5. **Conversas longas**:
   - Se a conversa atingir ~80 steps, sugerir ao usuário continuar em nova conversa
   - Não acumular dezenas de file reads + commands na mesma conversa

## Estrutura do Projeto (Monorepo)

```
app-rede-embaixadores/
├── app/          # Expo/React Native app (mobile)
├── backend/      # FastAPI + Python (API)
├── web/          # Next.js (portal admin) — futuro
├── supabase/     # Migrations e configs do Supabase
└── package.json  # Raiz do monorepo (pnpm workspaces)
```

## Gerenciador de Pacotes

- **Raiz e App**: usar `pnpm` (NÃO npm)
- **Backend**: usar `pip` com virtual env `.venv`
- Respeitar `.npmrc` na raiz que força uso do pnpm

## Stack Técnica

- **App Mobile**: React Native + Expo SDK 52
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy + Supabase
- **Banco**: PostgreSQL via Supabase
- **Design**: Estilo Apple-inspired, design premium

## ⚠️ REGRA OBRIGATÓRIA: Testes E2E após Mudanças no App

O projeto possui uma suite de testes E2E com Playwright em `e2e/`. Os testes DEVEM ser executados para validar que mudanças no app não quebraram funcionalidades existentes.

### Quando rodar os testes:

1. **SEMPRE rodar testes E2E após alterar arquivos em `app/`** (componentes, telas, navegação, stores)
2. **SEMPRE rodar testes E2E antes de fazer commit** de alterações no app
3. **Se um teste falhar**: corrigir o código OU atualizar o teste (se a mudança foi intencional) — NUNCA ignorar falhas

### Como rodar:

```bash
# Pré-requisito: Expo web deve estar rodando na porta 8081
# Terminal 1: cd app && npx expo start --web --port 8081

# Testes de UI (rápido, ~12s, não precisa de backend)
cd e2e && docker compose run --rm \
  -e BASE_URL=http://host.docker.internal:8081 \
  playwright npx playwright test -g "Validação de UI"

# Testes completos (precisa backend rodando em localhost:8000)
cd e2e && docker compose run --rm \
  -e BASE_URL=http://host.docker.internal:8081 \
  playwright npx playwright test
```

### Relatório de testes:

- O relatório HTML é gerado em `e2e/test-results/html/index.html`
- Inclui screenshots, vídeos e traces de falhas
- Informar o caminho do relatório ao usuário após a execução

### Ao criar/modificar telas do app:

1. **Sempre usar `accessibilityLabel`** nos elementos interativos (inputs, botões, links)
2. **Se mudar um `accessibilityLabel`**: atualizar o Page Object correspondente em `e2e/pages/`
3. **Se criar tela nova**: criar Page Object + testes correspondentes em `e2e/`

### Organização dos testes:

- **Page Objects**: `e2e/pages/` — encapsulam seletores e ações de cada tela
- **Testes**: `e2e/tests/` — organizados por feature (auth, profile, etc.)
- **Fixtures**: `e2e/fixtures/` — helpers e dados de teste
- Testes separados em "Validação de UI" (sem backend) e "Com backend" (precisa API)

### Se o teste falhar:

```
Teste falhou
    │
    ├── Bug no código? → Corrigir o app
    │
    └── Mudança intencional na UI?
            ├── Seletor mudou → Atualizar Page Object em e2e/pages/
            └── Comportamento mudou → Atualizar o .spec.ts
```

## ⚠️ REGRA OBRIGATÓRIA: Build do Admin antes de Commit

O admin (Next.js) possui verificação de tipos estrita no build de produção que pode falhar mesmo quando o dev server compila sem erros. **SEMPRE rodar o build de produção antes de commitar alterações em `admin/`.**

### Quando rodar:

1. **SEMPRE antes de fazer commit** de qualquer alteração em `admin/src/`
2. **Se o build falhar**: corrigir os erros de TypeScript antes de commitar — NUNCA commitar com build quebrado

### Como rodar:

```bash
# Via Docker (recomendado — usa o mesmo ambiente do deploy)
docker exec embaixadores-admin npx next build 2>&1

# Resultado esperado: "Generating static pages... (17/17)" sem erros
```

### Motivo:

- O dev server (`next dev`) é mais permissivo que o build de produção
- TypeScript strict mode pode aceitar código no dev mas rejeitar no build
- Deploys no Render e staging usam `next build` que falha em erros de tipo

## ⚠️ REGRA OBRIGATÓRIA: Atualizar Página de Ajuda

O admin possui uma página de ajuda standalone em `admin/src/app/help/page.tsx` que documenta todas as telas, campos e fluxos do painel. **Modificações na interface ou fluxo do admin devem ser refletidas na documentação de ajuda.**

### Quando atualizar:

1. **Adicionar/remover campos** de formulários (eventos, missões, conquistas, etc.)
2. **Alterar fluxos** de criação, edição ou exclusão
3. **Renomear labels** ou colunas de tabelas
4. **Adicionar/remover telas** ou funcionalidades
5. **Alterar comportamento** de toggles, filtros ou ações

### Como atualizar:

- A documentação está na constante `DOCS` em `admin/src/app/help/page.tsx`
- Cada seção do admin tem um bloco correspondente no array `DOCS`
- Use os mesmos nomes e labels exibidos na interface real
- NÃO usar termos técnicos internos (ex: usar "Pontos" e não "XP", usar "Conquistas" e não "badges")

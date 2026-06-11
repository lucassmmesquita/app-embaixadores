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

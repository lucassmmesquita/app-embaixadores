# 🔍 Análise: Travamento do Mac durante `pip install` no Backend

## O Problema

O comando que foi executado:
```bash
python3 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]" 2>&1 | tail -20
```

Esse comando faz **3 coisas pesadas simultaneamente**:
1. Cria um virtualenv (leve)
2. Instala o pacote em modo editável (`-e .`) — o que aciona o build system `hatchling`
3. Instala **TODAS** as dependências + dependências dev

---

## 🔎 Diagnóstico: Onde está o problema

### Dependências que exigem compilação nativa (C/C++/Rust)

| Dependência | Compilação? | Impacto na RAM | Observação |
|---|---|---|---|
| `pillow>=11.0.0` | ✅ **SIM** — compila extensões C | 🔴 **ALTO** | **NÃO É USADA** em nenhum arquivo do projeto! |
| `python-jose[cryptography]` | ✅ **SIM** — `cryptography` compila Rust + C | 🔴 **ALTO** | Usada em 1 arquivo (security.py) |
| `supabase>=2.10.0` | ⚠️ Parcial — puxa muitas subdeps | 🟡 **MÉDIO** | Usada em 2 arquivos (supabase.py, auth/service.py) |
| `asyncpg>=0.30.0` | ✅ **SIM** — extensão C para PostgreSQL | 🟡 **MÉDIO** | Usada (database.py) |
| `passlib[bcrypt]>=1.7.4` | ✅ **SIM** — `bcrypt` compila C | 🟡 **MÉDIO** | **NÃO É USADA** em nenhum arquivo! |
| `mypy>=1.13.0` (dev) | ✅ **SIM** — compila extensões | 🟡 **MÉDIO** | Dev dependency |
| `ruff>=0.8.0` (dev) | ✅ **SIM** — binário Rust | 🟡 **MÉDIO** | Dev dependency |

### O problema principal

Quando você roda `pip install -e ".[dev]"`, o pip tenta **resolver + baixar + compilar** tudo de uma vez. Pacotes como `cryptography`, `Pillow`, `bcrypt`, e `asyncpg` precisam de compilação nativa, e quando vários desses compilam em sequência (ou com build isolation), o consumo de RAM dispara.

> [!CAUTION]
> **`Pillow` e `passlib[bcrypt]` estão no pyproject.toml mas NÃO são usados em nenhum lugar do código!** São dependências mortas consumindo RAM na compilação à toa.

### Por que `npm install` nunca deu problema?

Pacotes npm usam binários **pré-compilados** (`.node` bindings já vêm prontos para sua arquitetura). O pip, por outro lado, frequentemente precisa **compilar do código fonte** quando não há wheel pré-compilado disponível para sua versão de Python/OS/arquitetura.

---

## ✅ Solução Proposta

### 1. Criar `requirements.txt` enxuto (somente o necessário)

Dependências **realmente usadas** no código:

```
# Core
fastapi[standard]>=0.115.0
uvicorn[standard]>=0.32.0

# Database
sqlalchemy[asyncio]>=2.0.36
asyncpg>=0.30.0
alembic>=1.14.0

# Validation & Config
pydantic>=2.10.0
pydantic-settings>=2.6.0

# Auth (JWT)
python-jose[cryptography]>=3.3.0

# Supabase SDK
supabase>=2.10.0

# HTTP client
httpx>=0.28.0

# Utilities
python-multipart>=0.0.12
python-dotenv>=1.0.1
```

### O que será REMOVIDO

| Removido | Motivo |
|---|---|
| `pillow>=11.0.0` | ❌ Zero imports no código. Compila C pesado. |
| `passlib[bcrypt]>=1.7.4` | ❌ Zero imports no código. Compila C. |

### 2. Criar `requirements-dev.txt` separado

```
-r requirements.txt
pytest>=8.3.0
pytest-asyncio>=0.24.0
pytest-cov>=6.0.0
ruff>=0.8.0
```

> [!NOTE]
> O `mypy` também foi removido do dev — é pesado de compilar e pouco usado nesta fase do projeto.

### 3. Novo comando de instalação (mais leve)

Em vez de:
```bash
pip install -e ".[dev]"  # PESADO — compila tudo + build system hatchling
```

Usar:
```bash
pip install --no-cache-dir -r requirements.txt  # LEVE — só instala dependências
```

A flag `--no-cache-dir` evita acúmulo de cache em disco. E sem o `-e .`, não aciona o build system `hatchling`.

### 4. Atualizar pyproject.toml

Manter o `pyproject.toml` limpo mas referenciando o `requirements.txt`, para manter compatibilidade com o Dockerfile.

---

## ⚡ Impacto esperado

| Métrica | Antes | Depois |
|---|---|---|
| Pacotes compilados | ~5 (pillow, cryptography, bcrypt, asyncpg, mypy) | ~2 (cryptography, asyncpg) |
| Deps totais (estimado) | ~80+ | ~50 |
| Tempo de install | ~3-5 min | ~1-2 min |
| Pico de RAM | 🔴 Trava o Mac | 🟢 Seguro |

---

## Posso aplicar as mudanças?

Vou:
1. Criar [requirements.txt](file:///Users/lucasmesquita/developer/app-rede-embaixadores/backend/requirements.txt)
2. Criar [requirements-dev.txt](file:///Users/lucasmesquita/developer/app-rede-embaixadores/backend/requirements-dev.txt)
3. Atualizar [pyproject.toml](file:///Users/lucasmesquita/developer/app-rede-embaixadores/backend/pyproject.toml) — remover Pillow e passlib
4. Atualizar [Dockerfile](file:///Users/lucasmesquita/developer/app-rede-embaixadores/backend/Dockerfile) — usar `requirements.txt`

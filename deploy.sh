#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  🚀 Rede de Embaixadores — Script de Gerenciamento
# ═══════════════════════════════════════════════════════════════════

set -e

# ── Cores ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# ── Diretórios ──
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
APP_DIR="$ROOT_DIR/app"
SUPABASE_DIR="$ROOT_DIR/supabase"

# ── Requisitos do Python ──
# O projeto exige Python >= 3.12 (pydantic v2, fastapi 0.115+, asyncpg)
# NUNCA usar o Python do Xcode (/Applications/Xcode.app/...) — causa loop
# infinito de subprocessos no ensurepip e estouro de memória (OOM).
REQUIRED_PYTHON_MAJOR=3
REQUIRED_PYTHON_MINOR=12
SAFE_PYTHON="python3.13"  # Homebrew Python

# ═══════════════════════════════════════════════════════════════════
#  Funções Auxiliares
# ═══════════════════════════════════════════════════════════════════

print_header() {
    clear
    echo ""
    echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║       🏛️  Rede de Embaixadores — Manager         ║${NC}"
    echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "\n${BLUE}${BOLD}── $1 ──${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${DIM}ℹ️  $1${NC}"
}

check_memory() {
    echo -e "${DIM}Verificando memória...${NC}"
    local mem_info
    mem_info=$(memory_pressure 2>/dev/null | head -3)
    echo -e "${DIM}$mem_info${NC}"

    local free_pct
    free_pct=$(echo "$mem_info" | grep -oE '[0-9]+%' | head -1 | tr -d '%')

    if [ -n "$free_pct" ] && [ "$free_pct" -lt 30 ]; then
        print_warning "Memória baixa (${free_pct}% livre). Feche apps antes de continuar."
        echo ""
        read -p "Continuar mesmo assim? (s/N): " confirm
        if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
            return 1
        fi
    else
        print_success "Memória OK"
    fi
    echo ""
    return 0
}

# ─────────────────────────────────────────────────────────────────
# Valida que o .venv usa um Python seguro (>= 3.12, não Xcode)
# Retorna 0 se válido, 1 se inválido/corrompido
# ─────────────────────────────────────────────────────────────────
validate_venv() {
    local venv_python="$BACKEND_DIR/.venv/bin/python3"

    if [ ! -d "$BACKEND_DIR/.venv" ]; then
        return 1  # não existe
    fi

    if [ ! -f "$venv_python" ] && [ ! -L "$venv_python" ]; then
        print_error ".venv existe mas python3 não encontrado dentro dele."
        return 1
    fi

    # ── Detectar Xcode Python (causa OOM por loop de subprocessos) ──
    local resolved
    resolved=$(readlink -f "$venv_python" 2>/dev/null || realpath "$venv_python" 2>/dev/null || echo "")
    if echo "$resolved" | grep -qiE "(Xcode|CommandLineTools)"; then
        print_error ".venv está vinculado ao Python do Xcode!"
        print_error "Isso causa loop infinito de subprocessos no ensurepip → OOM."
        print_info "Caminho resolvido: $resolved"
        return 1
    fi

    # ── Verificar versão do Python ──
    local py_version
    py_version=$("$venv_python" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "")

    if [ -z "$py_version" ]; then
        print_error "Não foi possível determinar a versão do Python no .venv"
        return 1
    fi

    local major minor
    major=$(echo "$py_version" | cut -d. -f1)
    minor=$(echo "$py_version" | cut -d. -f2)

    if [ "$major" -lt "$REQUIRED_PYTHON_MAJOR" ] || \
       ([ "$major" -eq "$REQUIRED_PYTHON_MAJOR" ] && [ "$minor" -lt "$REQUIRED_PYTHON_MINOR" ]); then
        print_error ".venv usa Python $py_version — projeto exige >= ${REQUIRED_PYTHON_MAJOR}.${REQUIRED_PYTHON_MINOR}"
        print_info "Dependências como pydantic v2, fastapi 0.115+ e asyncpg não funcionam com Python < 3.12"
        return 1
    fi

    print_success ".venv OK — Python $py_version ($resolved)"
    return 0
}

press_enter() {
    echo ""
    read -p "Pressione ENTER para voltar ao menu..."
}

# ═══════════════════════════════════════════════════════════════════
#  1. Backend Local
# ═══════════════════════════════════════════════════════════════════

run_backend() {
    print_section "🐍 Backend Local (FastAPI)"

    check_memory || return

    # Verificar se .venv existe
    if [ ! -d "$BACKEND_DIR/.venv" ]; then
        print_error "Virtual env não encontrado em $BACKEND_DIR/.venv"
        print_info "Use a opção 9 do menu para criar o .venv com segurança."
        press_enter
        return
    fi

    # Validar que o .venv é seguro (versão correta, não Xcode)
    if ! validate_venv; then
        echo ""
        print_warning ".venv está corrompido ou com versão incompatível!"
        print_info "Use a opção 9 do menu para recriar o .venv com segurança."
        press_enter
        return
    fi

    print_info "Ativando virtual env..."
    source "$BACKEND_DIR/.venv/bin/activate"

    print_info "Carregando variáveis de ambiente..."
    set -a
    source "$ROOT_DIR/.env"
    set +a

    # Verificar se uvicorn está instalado
    if ! "$BACKEND_DIR/.venv/bin/python3" -c "import uvicorn" 2>/dev/null; then
        print_error "uvicorn não está instalado no .venv!"
        print_info "Instalando dependências..."
        "$BACKEND_DIR/.venv/bin/python3" -m pip install -r "$BACKEND_DIR/requirements.txt" 2>&1 | tail -5
        echo ""
    fi

    print_success "Iniciando servidor em http://localhost:8000"
    print_info "Docs: http://localhost:8000/docs"
    print_info "Pressione Ctrl+C para parar"
    echo ""

    cd "$BACKEND_DIR"
    "$BACKEND_DIR/.venv/bin/python3" -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
}

# ═══════════════════════════════════════════════════════════════════
#  2. App no Simulador (iOS)
# ═══════════════════════════════════════════════════════════════════

run_app_ios() {
    print_section "📱 App — Simulador iOS"

    check_memory || return

    cd "$APP_DIR"

    print_success "Iniciando Expo no simulador iOS..."
    print_info "Pressione Ctrl+C para parar"
    echo ""

    npx expo start --ios
}

# ═══════════════════════════════════════════════════════════════════
#  3. App no Emulador (Android)
# ═══════════════════════════════════════════════════════════════════

run_app_android() {
    print_section "🤖 App — Emulador Android"

    check_memory || return

    cd "$APP_DIR"

    print_success "Iniciando Expo no emulador Android..."
    print_info "Pressione Ctrl+C para parar"
    echo ""

    npx expo start --android
}

# ═══════════════════════════════════════════════════════════════════
#  4. Web Local
# ═══════════════════════════════════════════════════════════════════

run_web() {
    print_section "🌐 Web Local (Expo Web)"

    check_memory || return

    cd "$APP_DIR"

    print_success "Iniciando versão web..."
    print_info "Abrindo em http://localhost:8081"
    print_info "Pressione Ctrl+C para parar"
    echo ""

    npx expo start --web
}

# ═══════════════════════════════════════════════════════════════════
#  5. Git — Commit e Push
# ═══════════════════════════════════════════════════════════════════

git_commit_push() {
    print_section "📦 Git — Commit & Push"

    cd "$ROOT_DIR"

    # Mostrar status
    echo -e "${DIM}Status atual:${NC}"
    git status --short
    echo ""

    # Verificar se há alterações
    if git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null && [ -z "$(git status --porcelain)" ]; then
        print_warning "Nenhuma alteração para commitar."
        press_enter
        return
    fi

    # Pedir mensagem de commit
    read -p "Mensagem do commit: " commit_msg

    if [ -z "$commit_msg" ]; then
        print_error "Mensagem não pode ser vazia."
        press_enter
        return
    fi

    # Confirmar branch
    local branch
    branch=$(git branch --show-current)
    echo ""
    print_info "Branch atual: ${BOLD}$branch${NC}"
    echo ""
    read -p "Confirmar commit e push na branch '$branch'? (s/N): " confirm

    if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
        print_warning "Cancelado."
        press_enter
        return
    fi

    # Executar
    echo ""
    git add -A
    git commit -m "$commit_msg"

    # Verificar se remote tem a branch (primeiro push?)
    if git ls-remote --heads origin "$branch" 2>/dev/null | grep -q "$branch"; then
        git push origin "$branch"
    else
        git push -u origin "$branch"
    fi

    echo ""
    print_success "Commit e push realizados com sucesso!"
    print_info "Repo: https://github.com/lucassmmesquita/app-embaixadores"
    press_enter
}

# ═══════════════════════════════════════════════════════════════════
#  6. Deploy Backend no Render
# ═══════════════════════════════════════════════════════════════════

deploy_render() {
    print_section "🚀 Deploy Backend no Render"

    cd "$ROOT_DIR"

    # Verificar se há commits
    if ! git rev-parse HEAD >/dev/null 2>&1; then
        print_warning "Nenhum commit encontrado no repositório!"
        print_info "Faça primeiro um commit (opção 5) antes de fazer deploy."
        press_enter
        return
    fi

    # Verificar se há alterações não commitadas
    if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
        print_warning "Existem alterações não commitadas!"
        echo ""
        read -p "Deseja commitar antes do deploy? (s/N): " confirm
        if [[ "$confirm" == "s" || "$confirm" == "S" ]]; then
            git_commit_push
        fi
    fi

    echo ""
    print_info "O Render faz deploy automático ao detectar push na branch main."
    print_info "Serviço: embaixadores-api"
    echo ""

    local branch
    branch=$(git branch --show-current)

    if [ "$branch" != "main" ]; then
        print_warning "Você está na branch '$branch', não na 'main'."
        echo ""
        echo -e "  Opções:"
        echo -e "    1) Fazer merge para main e push"
        echo -e "    2) Apenas fazer push da branch atual"
        echo -e "    3) Cancelar"
        echo ""
        read -p "Escolha [1-3]: " deploy_opt

        case $deploy_opt in
            1)
                git checkout main
                git merge "$branch"
                git push origin main
                git checkout "$branch"
                print_success "Merge para main e push realizados!"
                print_info "O Render detectará o push e fará o deploy automaticamente."
                ;;
            2)
                git push origin "$branch"
                print_success "Push realizado na branch '$branch'."
                print_warning "O deploy automático pode não ser acionado (depende da config do Render)."
                ;;
            3)
                print_warning "Cancelado."
                ;;
        esac
    else
        git push origin main
        print_success "Push para main realizado!"
        print_info "O Render detectará o push e fará o deploy automaticamente."
    fi

    echo ""
    print_info "Acompanhe o deploy em: https://dashboard.render.com"
    press_enter
}

# ═══════════════════════════════════════════════════════════════════
#  7. Atualizar Banco de Dados (Migrations)
# ═══════════════════════════════════════════════════════════════════

update_database() {
    print_section "🗄️  Atualizar Banco de Dados"

    echo -e "Migrations disponíveis em ${CYAN}supabase/migrations/${NC}:"
    echo ""

    # Listar migrations
    local i=1
    local migrations=()
    for f in "$SUPABASE_DIR/migrations/"*.sql; do
        if [ -f "$f" ]; then
            local basename
            basename=$(basename "$f")
            echo -e "  ${DIM}$i)${NC} $basename"
            migrations+=("$f")
            ((i++))
        fi
    done

    if [ ${#migrations[@]} -eq 0 ]; then
        print_warning "Nenhuma migration encontrada."
        press_enter
        return
    fi

    echo ""
    echo -e "  ${DIM}A) Rodar TODAS as migrations${NC}"
    echo -e "  ${DIM}0) Cancelar${NC}"
    echo ""
    read -p "Escolha [1-${#migrations[@]}/A/0]: " db_opt

    if [ "$db_opt" == "0" ]; then
        return
    fi

    # Carregar variáveis
    set -a
    source "$ROOT_DIR/.env"
    set +a

    echo ""
    print_warning "Isso executará SQL diretamente no banco de produção!"
    read -p "Tem certeza? (s/N): " confirm

    if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
        print_warning "Cancelado."
        press_enter
        return
    fi

    echo ""

    if [[ "$db_opt" == "A" || "$db_opt" == "a" ]]; then
        # Rodar todas
        for migration in "${migrations[@]}"; do
            local name
            name=$(basename "$migration")
            print_info "Executando: $name"
            psql "$DATABASE_URL" -f "$migration" 2>&1 | tail -5
            echo ""
        done
        print_success "Todas as migrations foram executadas!"
    else
        # Rodar uma específica
        local idx=$((db_opt - 1))
        if [ "$idx" -ge 0 ] && [ "$idx" -lt ${#migrations[@]} ]; then
            local migration="${migrations[$idx]}"
            local name
            name=$(basename "$migration")
            print_info "Executando: $name"
            psql "$DATABASE_URL" -f "$migration" 2>&1 | tail -20
            echo ""
            print_success "Migration '$name' executada!"
        else
            print_error "Opção inválida."
        fi
    fi

    press_enter
}

# ═══════════════════════════════════════════════════════════════════
#  8. Status Geral
# ═══════════════════════════════════════════════════════════════════

show_status() {
    print_section "📊 Status Geral do Projeto"

    cd "$ROOT_DIR"

    # Git
    echo -e "${BOLD}Git:${NC}"
    local branch
    branch=$(git branch --show-current)
    echo -e "  Branch: ${CYAN}$branch${NC}"
    local changes
    changes=$(git status --short | wc -l | tr -d ' ')
    if [ "$changes" -gt 0 ]; then
        echo -e "  Alterações: ${YELLOW}$changes arquivo(s) modificado(s)${NC}"
    else
        echo -e "  Alterações: ${GREEN}Nenhuma${NC}"
    fi
    echo -e "  Remote: ${DIM}$(git remote get-url origin)${NC}"
    echo ""

    # Python / .venv
    echo -e "${BOLD}Backend (.venv):${NC}"
    if [ -d "$BACKEND_DIR/.venv" ]; then
        validate_venv 2>/dev/null
        if [ $? -ne 0 ]; then
            echo -e "  ${RED}⚠ .venv com problema — use opção 9 para recriar${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠ .venv não existe — use opção 9 para criar${NC}"
    fi
    echo ""

    # Memória
    echo -e "${BOLD}Memória:${NC}"
    memory_pressure 2>/dev/null | head -3 | sed 's/^/  /'
    echo ""

    # Processos
    echo -e "${BOLD}Processos relevantes:${NC}"
    local procs
    procs=$(ps aux | grep -E "(uvicorn|expo|metro|node)" | grep -v grep | head -5)
    if [ -n "$procs" ]; then
        echo "$procs" | awk '{printf "  PID %-6s %s\n", $2, $11}' | head -5
    else
        echo -e "  ${DIM}Nenhum servidor rodando${NC}"
    fi

    press_enter
}

# ═══════════════════════════════════════════════════════════════════
#  9. Setup / Recriar .venv (com segurança)
# ═══════════════════════════════════════════════════════════════════

setup_venv() {
    print_section "🔧 Setup / Recriar .venv do Backend"

    check_memory || return

    # ── Detectar Python seguro (Homebrew) ──
    local python_bin=""

    # Tentar python3.13 primeiro (Homebrew)
    if command -v python3.13 &>/dev/null; then
        python_bin="python3.13"
    # Tentar python3.12
    elif command -v python3.12 &>/dev/null; then
        python_bin="python3.12"
    # Fallback: python3 genérico, mas validar
    elif command -v python3 &>/dev/null; then
        python_bin="python3"
    fi

    if [ -z "$python_bin" ]; then
        print_error "Nenhum Python encontrado no sistema!"
        print_info "Instale com: brew install python@3.13"
        press_enter
        return
    fi

    # Verificar que NÃO é o Python do Xcode
    local python_path
    python_path=$(which "$python_bin" 2>/dev/null)
    local resolved_path
    resolved_path=$(readlink -f "$python_path" 2>/dev/null || realpath "$python_path" 2>/dev/null || echo "$python_path")

    if echo "$resolved_path" | grep -qiE "(Xcode|CommandLineTools)"; then
        print_error "O '$python_bin' encontrado é do Xcode/CommandLineTools!"
        print_error "Caminho: $resolved_path"
        print_error "Isso causa loop infinito de subprocessos → estouro de memória (OOM)."
        echo ""
        print_info "Instale o Python do Homebrew:"
        echo -e "  ${CYAN}brew install python@3.13${NC}"
        echo -e "  ${DIM}Depois rode este script novamente.${NC}"
        press_enter
        return
    fi

    # Verificar versão
    local py_version
    py_version=$("$python_bin" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "")
    local major minor
    major=$(echo "$py_version" | cut -d. -f1)
    minor=$(echo "$py_version" | cut -d. -f2)

    if [ "$major" -lt "$REQUIRED_PYTHON_MAJOR" ] || \
       ([ "$major" -eq "$REQUIRED_PYTHON_MAJOR" ] && [ "$minor" -lt "$REQUIRED_PYTHON_MINOR" ]); then
        print_error "$python_bin é versão $py_version — projeto exige >= ${REQUIRED_PYTHON_MAJOR}.${REQUIRED_PYTHON_MINOR}"
        print_info "Instale com: brew install python@3.13"
        press_enter
        return
    fi

    print_success "Python detectado: $python_bin ($py_version)"
    print_info "Caminho: $resolved_path"
    echo ""

    # ── Se .venv já existe, perguntar se quer recriar ──
    if [ -d "$BACKEND_DIR/.venv" ]; then
        print_warning ".venv já existe."

        # Mostrar info do venv atual
        if validate_venv 2>/dev/null; then
            echo ""
            read -p "O .venv parece OK. Deseja recriar mesmo assim? (s/N): " confirm
        else
            echo ""
            print_warning "O .venv está corrompido/incompatível."
            read -p "Deseja recriar o .venv? (S/n): " confirm
            confirm=${confirm:-s}
        fi

        if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
            print_warning "Cancelado."
            press_enter
            return
        fi

        print_info "Removendo .venv antigo..."
        rm -rf "$BACKEND_DIR/.venv"
        print_success ".venv antigo removido."
    fi

    # ── Criar novo .venv ──
    echo ""
    print_info "Criando .venv com $python_bin..."
    "$python_bin" -m venv "$BACKEND_DIR/.venv"
    print_success ".venv criado com sucesso!"

    # ── Instalar dependências ──
    echo ""
    print_info "Instalando dependências do requirements.txt..."
    "$BACKEND_DIR/.venv/bin/python3" -m pip install --upgrade pip 2>&1 | tail -3
    "$BACKEND_DIR/.venv/bin/python3" -m pip install -r "$BACKEND_DIR/requirements.txt" 2>&1 | tail -10

    echo ""
    print_success "Setup completo! .venv pronto para uso."
    validate_venv

    press_enter
}

# ═══════════════════════════════════════════════════════════════════
#  Menu Principal
# ═══════════════════════════════════════════════════════════════════

show_menu() {
    print_header

    echo -e "${BOLD}  Desenvolvimento Local${NC}"
    echo -e "  ${GREEN}1)${NC} 🐍 Backend local          ${DIM}(FastAPI — porta 8000)${NC}"
    echo -e "  ${GREEN}2)${NC} 📱 App no simulador iOS    ${DIM}(Expo)${NC}"
    echo -e "  ${GREEN}3)${NC} 🤖 App no emulador Android ${DIM}(Expo)${NC}"
    echo -e "  ${GREEN}4)${NC} 🌐 Web local               ${DIM}(Expo Web — porta 8081)${NC}"
    echo ""
    echo -e "${BOLD}  Git & Deploy${NC}"
    echo -e "  ${MAGENTA}5)${NC} 📦 Commit e Push           ${DIM}(GitHub)${NC}"
    echo -e "  ${MAGENTA}6)${NC} 🚀 Deploy backend          ${DIM}(Render — auto-deploy)${NC}"
    echo ""
    echo -e "${BOLD}  Banco de Dados${NC}"
    echo -e "  ${YELLOW}7)${NC} 🗄️  Rodar migrations        ${DIM}(Supabase/PostgreSQL)${NC}"
    echo ""
    echo -e "${BOLD}  Utilitários${NC}"
    echo -e "  ${CYAN}8)${NC} 📊 Status geral"
    echo -e "  ${CYAN}9)${NC} 🔧 Setup / Recriar .venv   ${DIM}(Python seguro)${NC}"
    echo ""
    echo -e "  ${RED}0)${NC} Sair"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════
#  Main Loop
# ═══════════════════════════════════════════════════════════════════

main() {
    while true; do
        show_menu
        read -p "  Escolha uma opção [0-9]: " choice
        echo ""

        case $choice in
            1) run_backend ;;
            2) run_app_ios ;;
            3) run_app_android ;;
            4) run_web ;;
            5) git_commit_push ;;
            6) deploy_render ;;
            7) update_database ;;
            8) show_status ;;
            9) setup_venv ;;
            0)
                echo -e "${CYAN}👋 Até mais!${NC}"
                echo ""
                exit 0
                ;;
            *)
                print_error "Opção inválida!"
                sleep 1
                ;;
        esac
    done
}

main "$@"

# ═══════════════════════════════════════════════════════════════
#  Rede de Embaixadores — Makefile
#  Atalhos para comandos Docker de desenvolvimento e produção
#
#  Plataforma: os Dockerfiles do backend fixam linux/amd64
#  internamente. Funciona em qualquer host (Mac, Linux, Windows).
# ═══════════════════════════════════════════════════════════════

COMPOSE_DEV = docker compose -f infra/compose/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f infra/compose/docker-compose.prod.yml

# ── Desenvolvimento ──────────────────────────────────────────

.PHONY: dev
dev: ## Subir ambiente de desenvolvimento (hot-reload)
	$(COMPOSE_DEV) up -d

.PHONY: dev-build
dev-build: ## Buildar e subir ambiente de desenvolvimento
	$(COMPOSE_DEV) up -d --build

.PHONY: dev-down
dev-down: ## Parar ambiente de desenvolvimento
	$(COMPOSE_DEV) down

.PHONY: dev-logs
dev-logs: ## Ver logs dos containers de dev
	$(COMPOSE_DEV) logs -f

.PHONY: dev-logs-api
dev-logs-api: ## Ver logs do backend
	$(COMPOSE_DEV) logs -f api

.PHONY: dev-logs-admin
dev-logs-admin: ## Ver logs do admin
	$(COMPOSE_DEV) logs -f admin

# ── Produção ─────────────────────────────────────────────────

.PHONY: prod-build
prod-build: ## Buildar imagens de produção
	$(COMPOSE_PROD) build

.PHONY: prod
prod: ## Subir ambiente de produção
	$(COMPOSE_PROD) up -d

.PHONY: prod-down
prod-down: ## Parar ambiente de produção
	$(COMPOSE_PROD) down

# ── Utilitários ──────────────────────────────────────────────

.PHONY: clean
clean: ## Limpar containers e imagens não utilizados
	$(COMPOSE_DEV) down --remove-orphans
	docker image prune -f

.PHONY: help
help: ## Mostrar ajuda
	@echo ""
	@echo "  Rede de Embaixadores — Comandos Disponíveis"
	@echo "  ════════════════════════════════════════════"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

.DEFAULT_GOAL := help

# MedConnect — Dev Environment
# Usage: make <target>
#
# Targets:
#   make dev        Start databases + backend (one command)
#   make db         Start only databases
#   make backend    Start backend in watch mode
#   make seed       Run all seed scripts (requires DBs running)
#   make migrate    Run Prisma migrations
#   make stop       Stop all containers
#   make reset      Full reset: stop + delete volumes + restart + migrate + seed
#   make logs       Follow container logs
#   make status     Show container health status
#   make studio     Open Prisma Studio
#   make neo4j      Open Neo4j Browser in browser

COMPOSE := docker compose -f docker-compose.dev.yml
BACKEND_DIR := backend

.PHONY: dev dev-full db db-with-scylla backend seed seed-all seed-posts migrate stop reset reset-full logs logs-neo4j logs-postgres status studio neo4j kill-ports help

# ─── Main targets ────────────────────────────────────────────────────────────

dev: kill-ports db
	@echo "\n⏳ Waiting for databases to be ready..."
	@sleep 8
	@$(MAKE) migrate --no-print-directory
	@echo "\n🚀 Starting backend...\n"
	@cd $(BACKEND_DIR) && npm run start:dev

dev-full: kill-ports db-with-scylla
	@echo "\n⏳ Aguardando ScyllaDB inicializar (50s — necessário para o Scylla ficar healthy)..."
	@sleep 50
	@$(MAKE) migrate --no-print-directory
	@echo "\n🚀 Iniciando backend...\n"
	@cd $(BACKEND_DIR) && npm run start:dev

db:
	@echo "⏳ Aguardando Docker daemon ficar disponível..."
	@until docker info > /dev/null 2>&1; do printf "."; sleep 2; done && echo ""
	@echo "🐳 Starting databases..."
	@$(COMPOSE) up -d postgres neo4j redis
	@echo "✅ Databases started (postgres:5432, neo4j:7474/7687, redis:6379)"

db-with-scylla:
	@echo "⏳ Aguardando Docker daemon ficar disponível..."
	@until docker info > /dev/null 2>&1; do printf "."; sleep 2; done && echo ""
	@echo "🐳 Starting all databases (including ScyllaDB)..."
	@$(COMPOSE) --profile scylla up -d
	@echo "✅ All databases started (postgres:5432, neo4j:7474/7687, redis:6379, scylladb:9042)"

backend:
	@echo "🚀 Starting backend in watch mode..."
	@cd $(BACKEND_DIR) && npm run start:dev

seed:
	@echo "🌱 Running all seed scripts..."
	@cd $(BACKEND_DIR) && npm run prisma:seed
	@cd $(BACKEND_DIR) && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-institutions-posts.ts
	@cd $(BACKEND_DIR) && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-neo4j-specs.ts
	@cd $(BACKEND_DIR) && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-career-mentorship.ts
	@cd $(BACKEND_DIR) && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-collaboration-graph.ts
	@cd $(BACKEND_DIR) && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-events-courses.ts
	@cd $(BACKEND_DIR) && npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-graph-enrichment.ts
	@echo "✅ All seeds complete"

seed-all:
	@echo "🌱 Running master seed (creates doctors + all relationships)..."
	@cd $(BACKEND_DIR) && npm run seed:all
	@echo "📝 Seeding posts into ScyllaDB..."
	@cd $(BACKEND_DIR) && npm run seed:posts

seed-posts:
	@echo "📝 Seeding posts into ScyllaDB..."
	@cd $(BACKEND_DIR) && npm run seed:posts

migrate:
	@echo "🔄 Running Prisma migrations..."
	@cd $(BACKEND_DIR) && echo "y" | npx prisma migrate dev --name auto 2>/dev/null || npx prisma migrate deploy
	@cd $(BACKEND_DIR) && npx prisma generate
	@echo "✅ Migrations complete"

stop:
	@echo "🛑 Stopping all containers..."
	@$(COMPOSE) --profile scylla down
	@echo "✅ Stopped"

reset:
	@echo "♻️  Full reset: stopping containers and deleting volumes..."
	@$(COMPOSE) --profile scylla down -v
	@$(MAKE) db --no-print-directory
	@echo "⏳ Waiting for databases to initialize (30s)..."
	@sleep 30
	@$(MAKE) migrate --no-print-directory
	@$(MAKE) seed-all --no-print-directory
	@echo "\n✅ Reset complete! Run 'make backend' to start the server."

reset-full:
	@echo "♻️  Full reset (with ScyllaDB): stopping containers and deleting volumes..."
	@$(COMPOSE) --profile scylla down -v
	@$(MAKE) db-with-scylla --no-print-directory
	@echo "⏳ Aguardando todos os bancos inicializarem (60s — ScyllaDB é lento)..."
	@sleep 60
	@$(MAKE) migrate --no-print-directory
	@$(MAKE) seed-all --no-print-directory
	@echo "\n✅ Reset completo! Execute 'make backend' para iniciar o servidor."

logs:
	@$(COMPOSE) logs -f

logs-neo4j:
	@$(COMPOSE) logs -f neo4j

logs-postgres:
	@$(COMPOSE) logs -f postgres

status:
	@echo "📊 Container status:"
	@$(COMPOSE) --profile scylla ps

studio:
	@echo "🔍 Opening Prisma Studio..."
	@cd $(BACKEND_DIR) && npx prisma studio

neo4j:
	@echo "🔗 Opening Neo4j Browser..."
	@open http://localhost:7474 || xdg-open http://localhost:7474

# ─── Kill processes on common ports ──────────────────────────────────────────

kill-ports:
	@echo "🛑 Stopping Docker containers gracefully (releases DB ports safely)..."
	@docker compose -f docker-compose.yml down 2>/dev/null || true
	@$(COMPOSE) --profile scylla down 2>/dev/null || true
	@sleep 3
	@echo "🔪 Killing native backend process on port 3000 (if running)..."
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "✅ Ports freed"

# ─── Help ─────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "MedConnect Dev Commands"
	@echo "────────────────────────────────────────────────────────"
	@echo "  STARTUP"
	@echo "  make dev          Start DBs (sem Scylla) + backend"
	@echo "  make dev-full     Start TODOS os DBs (com Scylla) + backend"
	@echo "  make backend      Start backend apenas (watch mode)"
	@echo ""
	@echo "  DADOS"
	@echo "  make seed-all     Criar 15 médicos demo + grafo Neo4j"
	@echo "  make migrate      Rodar migrações Prisma"
	@echo ""
	@echo "  RESET"
	@echo "  make reset        Wipe + restart (sem Scylla) + seed"
	@echo "  make reset-full   Wipe + restart (com Scylla) + seed"
	@echo ""
	@echo "  PARAR"
	@echo "  make stop         Parar todos os containers"
	@echo "  make kill-ports   Liberar portas 3000/5432/7474/7687/6379/9042"
	@echo ""
	@echo "  FERRAMENTAS"
	@echo "  make logs         Logs de todos os containers"
	@echo "  make status       Status dos containers"
	@echo "  make studio       Prisma Studio (explorar banco)"
	@echo "  make neo4j        Neo4j Browser (ver grafo)"
	@echo ""
	@echo "  LLM (Agentic Search)"
	@echo "  Edite backend/.env e preencha uma chave:"
	@echo "    LLM_PROVIDER=claude  +  ANTHROPIC_API_KEY=sk-ant-..."
	@echo "    LLM_PROVIDER=openai  +  OPENAI_API_KEY=sk-..."
	@echo "    LLM_PROVIDER=gemini  +  GOOGLE_AI_API_KEY=AIza..."
	@echo ""

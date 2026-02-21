# CLAUDE.md - Coding Guidelines for MedConnect

## Development Rules

1. **Before writing any code, describe your approach and wait for approval. Always ask clarifying questions before writing any code if requirements are ambiguous.**

2. **If a task requires changes to more than 3 files, stop and break it into smaller tasks first.**

3. **After writing code, list what could break and suggest tests to cover it.**

4. **When there's a bug, start by writing a test that reproduces it, then fix it until the test passes.**

5. **Every time I correct you, add a new rule to this CLAUDE.md file so it never happens again.**

## Project Context

- **Project:** MedConnect - Professional networking platform for Brazilian doctors
- **Backend:** NestJS + TypeScript with PostgreSQL (Prisma), Neo4j, ScyllaDB, Redis
- **Mobile:** Flutter with Riverpod, GoRouter, Dio
- **AI:** Agentic Search with multi-provider LLM (OpenAI, Claude, Gemini)

## Build & Test Commands

```bash
# ── Preferred: use Makefile from root ──
make dev          # Start databases + backend in one command
make seed-all     # Create 15 demo doctors + full Neo4j graph
make reset        # Full reset: wipe data + restart + seed
make stop         # Stop all containers
make neo4j        # Open Neo4j Browser at localhost:7474
make studio       # Open Prisma Studio

# ── Backend (manual) ──
cd backend && npm install
npm run start:dev
npm run seed:all          # Master seed (doctors + Neo4j graph)
npm run test

# ── Mobile ──
cd mobile && flutter pub get
flutter run
flutter test

# ── Docker (databases only — preferred) ──
docker compose -f docker-compose.dev.yml up -d postgres neo4j redis
```

## Architecture Notes

- PostgreSQL is the source of truth for relational data (users, doctors, patients, appointments)
- Neo4j mirrors lightweight copies for graph traversals (connections, recommendations, paths)
- ScyllaDB handles high-throughput data (posts, feed, chat, notifications)
- Redis handles caching, sessions, and online presence
- Sync between PostgreSQL and Neo4j is event-driven via `neo4j-sync.listener.ts`
- Neo4j password is `medconnect_dev_2026` — all seed scripts must use `NEO4J_PASSWORD` env var, not hardcoded defaults

## Flutter Routing

- Router lives in `mobile/lib/core/routing/app_router.dart`
- Bottom nav: Feed (`/home`), Conexões (`/connections`), Buscar (`/search`), Vagas (`/jobs`), Perfil (`/profile`)
- Graph visualization at `/network` — accessible via button in ConnectionsScreen AppBar
- All screens must be registered in GoRouter before they can be navigated to

## Theme System

- `medconnect_theme.dart` is the PRIMARY theme — used by `main.dart` via `MedConnectTheme.light`
- `app_theme.dart` provides `AppColors`, `AppTextStyles`, `AppSpacing`, `AppRadius` utilities used directly in widgets
- Do NOT import `medconnect_theme.dart` just for colors in new widgets — use `app_theme.dart` instead
- Both files can coexist: `medconnect_theme.dart` = ThemeData, `app_theme.dart` = color/style utilities

## Demo Credentials

After running `make seed-all`:
- Email: `ana.silva@medconnect.dev`
- Password: `MedConnect@2026`
- 15 demo doctors available with full Neo4j relationships

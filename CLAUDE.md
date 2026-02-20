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
# Backend
cd backend && npm install
npm run build
npm run start:dev
npm run test
npm run test:e2e

# Mobile
cd mobile && flutter pub get
flutter run
flutter test

# Docker (databases only - development)
docker compose up -d

# Docker (databases + backend - production-like)
docker compose --profile full up -d
```

## Architecture Notes

- PostgreSQL is the source of truth for relational data (users, doctors, patients, appointments)
- Neo4j mirrors lightweight copies for graph traversals (connections, recommendations, paths)
- ScyllaDB handles high-throughput data (posts, feed, chat, notifications)
- Redis handles caching, sessions, and online presence
- Sync between PostgreSQL and Neo4j is event-driven via `neo4j-sync.listener.ts`

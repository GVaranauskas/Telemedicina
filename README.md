# MedConnect - Rede Social para Médicos

Plataforma de networking profissional para médicos brasileiros, conectando profissionais de saúde, instituições e oportunidades.

## Tecnologias

### Backend (NestJS + TypeScript)
- **PostgreSQL** (Prisma ORM) - dados cadastrais e transacionais
- **Neo4j** - grafo de relacionamentos e busca inteligente
- **ScyllaDB** - posts, feed, chat e notificações (alto throughput)
- **Redis** - cache, sessões e presença online
- **JWT** - autenticação com access + refresh tokens

### Mobile (Flutter)
- **Riverpod** - gerenciamento de estado
- **GoRouter** - navegação
- **Dio** - cliente HTTP
- **Socket.IO** - chat em tempo real

### IA (Agentic Search)
- Busca em linguagem natural com IA
- Multi-provider: OpenAI, Claude, Gemini
- Agente com tools para consultar o grafo Neo4j
- Recomendações proativas baseadas no grafo

## Setup Rápido

### 1. Subir os bancos de dados (Docker)

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

A API estará em http://localhost:3000
Swagger docs em http://localhost:3000/api/docs

### 3. Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

## Arquitetura dos Bancos

| Dado | PostgreSQL | Neo4j | ScyllaDB |
|------|-----------|-------|----------|
| Contas e perfis | X | cópia leve | |
| Conexões | audit | X (grafo) | |
| Especialidades | X (ref) | X (nós) | |
| Instituições | X | X (nós) | |
| Vagas | X | X (nós) | |
| Posts e feed | | | X |
| Chat | | | X |
| Notificações | | | X |

## Endpoints Principais

- `POST /api/v1/auth/register` - Cadastro
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/doctors/me` - Meu perfil
- `GET /api/v1/feed/timeline` - Feed
- `GET /api/v1/connections/suggestions` - Sugestões (grafo)
- `GET /api/v1/jobs/search` - Buscar vagas
- `POST /api/v1/agentic-search/query` - Busca IA
- `GET /api/v1/agentic-search/recommendations` - Recomendações IA

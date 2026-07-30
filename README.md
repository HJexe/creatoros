<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://your-cdn.dev/creatoros-banner-dark.svg">
  <img alt="CreatorOS" src="https://your-cdn.dev/creatoros-banner-light.svg">
</picture>

# CreatorOS

**Open-source, self-hostable YouTube growth toolkit. Privacy-first alternative to TubeBuddy and vidIQ.**

CreatorOS provides creators with AI-powered SEO, analytics, and workflow tools — without selling their data or paying monthly subscriptions. Self-host on your own infrastructure, or use our managed cloud.

> **Status:** Phase 0 — Foundation (pre-alpha). See [ROADMAP.md](docs/ROADMAP.md).

---

## Features

- **Analytics Engine** — Real-time sync with YouTube Data/Analytics APIs. CTR, retention heatmaps, RPM tracking, growth forecasting.
- **SEO & Keyword Intelligence** — YouTube Suggest scraping, keyword clustering, search volume estimation, competition scoring, opportunity scores.
- **AI Creative Suite** — Title/description/script generation, tag optimization, comment reply suggestions. Bring your own API key (OpenAI, Anthropic, Google, or local via Ollama).
- **Thumbnail Analyzer** — Computer vision pipeline: contrast scoring, gaze detection, text overlay analysis, color harmony.
- **Competitor Tracking** — Growth velocity, topic overlap, content gap analysis.
- **Trend Intelligence** — Google Trends integration, rising niche detection.
- **Content Calendar** — Kanban-style planning, production stage tracking, schedule management.
- **Automated Reports** — Weekly/monthly PDF/CSV reports, delivered via Discord/Slack/webhook.
- **Browser Extension** — Chrome MV3 extension that injects SEO scores and analytics overlays directly into YouTube Studio.
- **Plugin SDK** — Extend CreatorOS with custom plugins. See [DEVELOPER_ECOSYSTEM.md](docs/DEVELOPER_ECOSYSTEM.md).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, Framer Motion |
| **Backend** | Fastify, Prisma ORM, PostgreSQL 16, Redis 7 |
| **AI** | Provider-agnostic layer: OpenAI, Anthropic, Google AI, Ollama (local) |
| **Workers** | BullMQ (Redis-backed task queue) |
| **Storage** | PostgreSQL (primary), Redis (cache/queue), MinIO (thumbnails/assets) |
| **Auth** | JWT (RS256), OAuth 2.0 (Google/YouTube), API keys |
| **Infra** | Docker Compose, Traefik (reverse proxy + TLS) |
| **Monorepo** | Turborepo, pnpm workspaces |

## Quick Start

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose
- YouTube Data API key (Google Cloud Console)

### Development

```bash
# 1. Clone and install
git clone https://github.com/creatoros/creatoros.git
cd creatoros
pnpm install

# 2. Copy environment file and configure
cp packages/config/default.env apps/api/.env
# Edit .env with your keys (YouTube API, JWT secret, etc.)

# 3. Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose -f docker/docker-compose.yml up -d postgres redis minio

# 4. Run database migrations
pnpm db:migrate

# 5. Start development servers
pnpm dev
```

This starts:
- **Web app:** http://localhost:3000
- **API:** http://localhost:3001
- **API docs:** http://localhost:3001/docs
- **MinIO Console:** http://localhost:9001

### Production (Self-Host)

```bash
# 1. Clone
git clone https://github.com/creatoros/creatoros.git
cd creatoros

# 2. Configure environment
cp .env.example .env
# Edit .env with all required values

# 3. Start everything
docker compose -f docker/docker-compose.yml up -d
```

Deploy on any VPS, or one-click via:
- [Coolify](https://coolify.io)
- [Railway](https://railway.app)
- [Kamal](https://kamal-deploy.org)

## Project Structure

```
creatoros/
├── apps/
│   ├── web/                  # Next.js dashboard
│   ├── api/                  # Fastify API gateway
│   ├── ai-worker/            # AI processing worker (BullMQ)
│   ├── analytics-worker/     # YouTube data sync worker
│   ├── extension/            # Chrome MV3 extension
│   └── docs/                 # Documentation site
├── packages/
│   ├── shared/               # Types, Zod validators, constants
│   ├── ui/                   # shadcn/ui + custom components
│   ├── database/             # Prisma schema + client
│   ├── ai/                   # AI provider abstraction layer
│   ├── config/               # Shared configuration
│   └── sdk/                  # Plugin SDK
├── docker/                   # Docker Compose + Dockerfiles
├── prisma/                   # Canonical schema
└── docs/                     # Architecture, roadmap, etc.
```

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, Mermaid diagrams, data flow |
| [API.md](docs/API.md) | API specification |
| [DATABASE.md](docs/DATABASE.md) | Database schema, indexing, partitioning |
| [ROADMAP.md](docs/ROADMAP.md) | Phased implementation plan |
| [SECURITY.md](docs/SECURITY.md) | Auth, encryption, rate limiting, CSP |
| [DEVELOPER_ECOSYSTEM.md](docs/DEVELOPER_ECOSYSTEM.md) | Plugin SDK, CI/CD, contributing |
| [DESIGN_PHILOSOPHY.md](docs/DESIGN_PHILOSOPHY.md) | UI/UX principles, design tokens |

## Configuration

All configuration is Zod-validated at startup. Key environment variables:

```env
# Required
DATABASE_URL=postgres://user:pass@localhost:5432/creatoros
REDIS_URL=redis://:password@localhost:6379
JWT_SECRET=<min-32-char-random-string>
JWT_REFRESH_SECRET=<min-32-char-random-string>
ENCRYPTION_KEY=<min-32-char-hex-string>

# YouTube API (Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI Providers (at least one)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Optional: Local AI
OLLAMA_BASE_URL=http://localhost:11434
```

## License

[AGPL-3.0](LICENSE) — Free to use, modify, and distribute. Commercial use requires a license purchase for closed-source deployments.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR process.

## Security

Found a vulnerability? Email security@creatoros.dev. See [SECURITY.md](docs/SECURITY.md) for our security protocol.

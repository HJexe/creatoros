# CreatorOS — System Architecture

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ Next.js   │  │  Chrome      │  │  PWA (Mobile)    │  │  Docs/     │ │
│  │ Dashboard │  │  Extension   │  │  (Future)        │  │  Landing   │ │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  └─────┬──────┘ │
└───────┼─────────────────┼───────────────────┼──────────────────┼───────┘
        │                 │                   │                  │
        │          HTTPS/WSS                  │                  │
        ▼                 ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Fastify + @fastify/gateway  │  Rate Limit  │  JWT Auth  │  CORS  ││
│  │  /api/v1/*  │  /ws/*  │  /extension/*  │  /webhook/*              ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   API Service   │ │  Analytics      │ │  AI Worker      │
│   (Fastify)     │ │  Worker (Bull)  │ │  (BullMQ)       │
│   REST + WS     │ │  Data Pipeline  │ │  LLM Orchestr.  │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │PostgreSQL│  │  Redis   │  │Supabase  │  │  S3/Minio│  │  Qdrant  │ │
│  │(Primary) │  │(Cache/   │  │(Auth/    │  │(Assets,  │  │(Vector   │ │
│  │Prisma    │  │ Queue)   │  │ Realtime)│  │Thumbnails│  │  DB for  │ │
│  │          │  │          │  │          │  │          │  │  RAG)    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Monorepo Structure

```
creatoros/
├── apps/
│   ├── web/                    # Next.js 14 (App Router) Dashboard
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   ├── components/     # Shared UI components
│   │   │   ├── hooks/          # React hooks
│   │   │   ├── lib/            # Utilities, API client
│   │   │   └── providers/      # React context providers
│   │   └── public/
│   │
│   ├── api/                    # Fastify API Gateway + Services
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers
│   │   │   ├── plugins/        # Fastify plugins
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, rate-limit, validation
│   │   │   └── webhooks/       # YouTube PubSub, Discord, Slack
│   │   └── openapi/            # OpenAPI specs
│   │
│   ├── ai-worker/              # BullMQ consumer for AI tasks
│   │   ├── src/
│   │   │   ├── providers/      # OpenAI, Anthropic, Google, Ollama
│   │   │   ├── agents/         # Specialized AI agents
│   │   │   ├── tools/          # LLM function calling tools
│   │   │   └── thumbnail/      # OpenCV processing
│   │   └── models/             # Local model management
│   │
│   ├── analytics-worker/       # Data pipeline worker
│   │   ├── src/
│   │   │   ├── collectors/     # YouTube Data API, Analytics API
│   │   │   ├── processors/     # ETL, aggregation, forecasting
│   │   │   └── exporters/      # CSV, PDF report generation
│   │   └── sql/                # Materialized view definitions
│   │
│   ├── extension/              # Chrome MV3 Extension
│   │   ├── src/
│   │   │   ├── content/        # YouTube Studio inject scripts
│   │   │   ├── popup/          # Popup UI
│   │   │   ├── background/     # Service workers
│   │   │   └── overlay/        # Analytics overlay components
│   │   └── public/
│   │
│   └── docs/                   # Documentation site (Next.js/Mintlify)
│
├── packages/
│   ├── shared/                 # Shared types, Zod schemas, constants
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── validators/     # Zod schemas (shared DTO validation)
│   │   │   └── constants/      # Enums, config constants
│   │
│   ├── ui/                     # shadcn/ui components + custom
│   │   ├── src/
│   │   │   ├── components/     # Base UI components
│   │   │   ├── charts/         # ECharts wrappers
│   │   │   └── glassmorphic/   # Glassmorphism theme primitives
│   │   └── tailwind.config.ts
│   │
│   ├── database/               # Prisma client + migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Canonical schema
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── client.ts       # Prisma client singleton
│   │       └── seed.ts         # Seed scripts
│   │
│   ├── ai/                     # AI provider abstraction layer
│   │   ├── src/
│   │   │   ├── providers/      # Provider implementations
│   │   │   ├── router.ts       # Intelligent model router
│   │   │   └── prompts/        # Prompt templates library
│   │   └── tests/
│   │
│   ├── config/                 # Shared config (env, constants)
│   │   ├── src/
│   │   │   ├── env.ts          # Zod-validated env schema
│   │   │   └── features.ts     # Feature flags
│   │   └── default.env
│   │
│   └── sdk/                    # Plugin SDK for third-party devs
│       ├── src/
│       │   ├── plugin.ts       # Plugin base class
│       │   ├── hooks/          # Lifecycle hooks
│       │   └── api/            # Plugin API client
│       └── templates/          # Plugin starter templates
│
├── prisma/                     # Root schema reference (symlinked)
├── docker/
│   ├── docker-compose.yml      # Full stack
│   ├── docker-compose.dev.yml  # Dev overrides
│   └── Dockerfile.*            # Per-service Dockerfiles
│
├── scripts/                    # Devops & migration scripts
├── .github/
│   └── workflows/              # CI/CD pipelines
└── docs/                       # This documentation
```

## 3. Service Communication

```
┌─────────┐     REST/WS      ┌──────────┐
│  Next.js ├─────────────────►  Fastify  │
│   App    │◄────────────────│  Gateway  │
└─────────┘    JSON/SSE      └────┬─────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
               ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
               │  Redis   │ │  Redis  │ │  Redis  │
               │  Cache   │ │  Queue  │ │  PubSub │
               └─────────┘ └─────────┘ └─────────┘
                              │     │
                    ┌─────────▼┐   ┌▼─────────┐
                    │   AI     │   │Analytics │
                    │  Worker  │   │  Worker  │
                    └──────────┘   └──────────┘
```

- **Synchronous:** REST over HTTP/2 between gateway and API service
- **Async:** BullMQ queues for AI processing, analytics sync, report generation
- **Real-time:** Server-Sent Events (SSE) for dashboard live updates; WebSocket for extension bridge
- **Internal:** Direct Prisma client usage within service boundaries (no HTTP between internal services)

## 4. AI Layer Architecture

```
┌──────────────────────────────────────────────────┐
│                  AI Router                        │
│  ┌──────────────────────────────────────────────┐ │
│  │  Score-based model selection:                │ │
│  │  - Task type (chat, vision, embedding, code) │ │
│  │  - Cost budget (per-user/per-channel)        │ │
│  │  - Latency requirement                       │ │
│  │  - Provider availability (fallback chain)    │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
┌────────────────┐┌────────────────┐┌────────────────┐
│   OpenAI       ││   Anthropic    ││   Google AI    │
│   GPT-4o / o3 ││   Claude 4     ││   Gemini 2.5   │
│   text-embedding││   Sonnet      ││   Pro / Flash  │
└────────────────┘└────────────────┘└────────────────┘
         │             │             │
         └─────────────┼─────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│           Local LLM Bridge (Ollama)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Llama 3 │ │  Mistral │ │  Embedding       │ │
│  │  70B     │ │  8x22B   │ │  Models (Nomic)  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────────────────────────────────────┘
```

### AI Agent Specializations

| Agent | Model Priority | Tools | Purpose |
|-------|---------------|-------|---------|
| Title Generator | Gemini 2.5 Flash → GPT-4o-mini | YouTube search, keyword DB | Generates 10+ title variants |
| Description Optimizer | Claude 3.5 Sonnet | SEO scoring, keyword API | SEO-optimized descriptions |
| Script Writer | Claude 4 Opus → GPT-4o | RAG over channel content | Full script generation |
| Thumbnail Analyzer | Local (OpenCV/ONNX) | Computer vision pipeline | Contrast, gaze, text detection |
| Keyword Researcher | GPT-4o-mini → Local | YouTube Suggest, Trends | Keyword clusters, volume |
| Competitor Analyzer | Claude 3.5 Sonnet | Public API data | Growth velocity reports |
| Analytics Explainer | GPT-4o-mini | Channel analytics RAG | Plain-English insights |

## 5. Data Flow: Analytics Pipeline

```
YouTube Data API  ──►  Analytics Worker (cron: */15 * * * *)
       │
       ▼
  Fetch raw data (videos, stats, comments)
       │
       ▼
  Validate + Transform (Zod schemas)
       │
       ▼
  Write to PostgreSQL (upsert)
       │
       ▼
  Trigger materialized view refresh
       │
       ▼
  Compute derived metrics:
    ├─ Estimated CTR (relative)
    ├─ RPM / CPM trends (7/30/90d)
    ├─ Retention heatmap z-scores
    ├─ Growth velocity (WoW, MoM)
    ├─ Keyword rank tracking
    └─ Opportunity scoring
       │
       ▼
  Push to Redis cache (TTL: 5min)
       │
       ▼
  SSE notification to dashboard
```

## 6. Extension ↔ Backend Bridge

```
┌────────────────────┐         ┌────────────────────┐
│  YouTube Studio    │         │  CreatorOS Backend │
│  (Injected Frame)  │         │                    │
│                    │  HTTPS  │                    │
│  content.ts ───────┼────────►│  /api/v1/extension │
│  (MutationObs.)    │         │  /ws/extension     │
│                    │◄────────┼────────────────────│
│  overlay.tsx       │  SSE    │  Real-time data    │
│  (React root)      │  +JSON  │  overlay payloads  │
└────────────────────┘         └────────────────────┘

Data Injected:
├─ SEO Score overlay (video edit page)
├─ Keyword difficulty (search page)
├─ Competitor watch time (analytics)
├─ Thumbnail A/B test results
└─ Upload checklist sidebar
```

## 7. Component Architecture (Frontend)

```
┌──────────────────────────────────────────────────┐
│                   Shell Layout                    │
│  ┌──────────┬──────────────────────────────────┐ │
│  │  K-Bar   │  Top Navigation                  │ │
│  │  (Cmd+K) │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──────┐ │ │
│  │          │  │D │ │A │ │S │ │C │ │Search│ │ │
│  │          │  └──┘ └──┘ └──┘ └──┘ └──────┘ │ │
│  ├──────────┼──────────────────────────────────┤ │
│  │  Sidebar │     Main Content Area            │ │
│  │  Nav     │                                  │ │
│  │          │  ┌────────────────────────────┐  │ │
│  │  ► Dash  │  │   Resizable Panel Group    │  │ │
│  │  ► Anal. │  │   ┌──────────┬──────────┐ │  │ │
│  │  ► SEO   │  │   │  Chart   │  Table   │ │  │ │
│  │  ► AI    │  │   ├──────────┼──────────┤ │  │ │
│  │  ► Video │  │   │  KPI     │  Trends  │ │  │ │
│  │  ► Comp. │  │   └──────────┴──────────┘ │  │ │
│  │  ► Sets  │  └────────────────────────────┘  │ │
│  └──────────┴──────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### Key UI Patterns
- **Command Palette (K-Bar):** `cmdk`-based, global `Cmd+K` triggers actions, search, navigation
- **Resizable Panels:** `react-resizable-panels` for data-dense dashboards
- **Glassmorphic Cards:** Backdrop-blur cards with subtle border glow
- **Data Visualization:** Apache ECharts for complex charts, lightweight Chart.js for simple KPIs
- **Opportunity Scores:** Actionable 0-100 scores with color coding and AI explainers

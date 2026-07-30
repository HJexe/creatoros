# Developer Ecosystem

## Plugin SDK Blueprint

The Plugin SDK (`@creatoros/sdk`) enables third-party developers to extend CreatorOS with custom functionality — analytics exports, custom AI providers, notification channels, and more.

### SDK Architecture

```
┌────────────────────────────────────┐
│        CreatorOS Host              │
│  ┌──────────────────────────────┐  │
│  │         Plugin Manager        │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐   │  │
│  │  │ P1  │ │ P2  │ │ P3  │   │  │
│  │  └─────┘ └─────┘ └─────┘   │  │
│  └──────────────────────────────┘  │
└──────────┬─────────────────────────┘
           │ Plugin API (sandboxed)
           ▼
┌────────────────────────────────────┐
│         Plugin Process             │
│  ┌──────────────────────────────┐  │
│  │  Lifecycle Hooks             │  │
│  │  ├─ onActivate()             │  │
│  │  ├─ onDeactivate()           │  │
│  │  ├─ onVideoPublished()       │  │
│  │  ├─ onAnalyticsRefresh()     │  │
│  │  └─ onAITaskComplete()       │  │
│  │                              │  │
│  │  API Access                  │  │
│  │  ├─ sdk.analytics.*          │  │
│  │  ├─ sdk.videos.*             │  │
│  │  ├─ sdk.keywords.*           │  │
│  │  ├─ sdk.ai.*                 │  │
│  │  ├─ sdk.notifications.*      │  │
│  │  └─ sdk.http.*               │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### Plugin Definition
```typescript
// packages/sdk/src/plugin.ts
import { z } from 'zod'

export const PluginManifestSchema = z.object({
  name: z.string().regex(/^@creatoros\/plugin-/),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  license: z.string().default('MIT'),
  permissions: z.array(z.enum([
    'analytics:read', 'analytics:write',
    'videos:read', 'videos:write',
    'keywords:read', 'keywords:write',
    'ai:generate',
    'notifications:send',
    'http:fetch',
  ])),
  hooks: z.array(z.string()),
  ui: z.object({
    sidebar: z.boolean().optional(),
    dashboard: z.boolean().optional(),
    settings: z.boolean().optional(),
  }).optional(),
  configSchema: z.record(z.any()).optional(), // JSON Schema
})

export type PluginManifest = z.infer<typeof PluginManifestSchema>
```

### Example Plugin — Analytics Exporter
```typescript
// @creatoros/plugin-csv-export
import { definePlugin } from '@creatoros/sdk'
import { stringify } from 'csv-stringify/sync'

export default definePlugin({
  manifest: {
    name: '@creatoros/plugin-csv-export',
    version: '1.0.0',
    description: 'Export any analytics view to CSV',
    permissions: ['analytics:read'],
    hooks: ['onAnalyticsRefresh'],
    ui: { dashboard: true },
  },

  hooks: {
    onAnalyticsRefresh: async (context, { channelId, period }) => {
      const analytics = await context.sdk.analytics.getOverview(channelId, period)
      const csv = stringify(analytics.videos)
      await context.sdk.notifications.send({
        title: 'CSV Export Ready',
        message: `Exported ${analytics.videos.length} videos`,
        action: { label: 'Download', url: `/api/plugins/csv-export/${channelId}/${period}` },
      })
    },
  },

  ui: {
    dashboard: {
      component: 'ExportButton',
      position: 'analytics-toolbar',
    },
  },
})
```

### Plugin Lifecycle
```
install ──► validate manifest ──► request permissions ──► store
  │
  ▼
activate ──► run onActivate() ──► register hooks ──► ready
  │
  ▼
  runtime  ◄── hooks triggered by host events
  │
  ▼
deactivate ──► run onDeactivate() ──► unregister hooks
  │
  ▼
uninstall ──► remove from registry ──► cleanup storage
```

### Plugin Development CLI
```bash
# Scaffold a new plugin
pnpm create @creatoros/plugin my-plugin

# Dev mode (symlinked to local CreatorOS instance)
pnpm dev:plugin ./path/to/my-plugin

# Package for distribution
pnpm build:plugin

# Validate manifest
pnpm validate:plugin
```

### Permissions System
- Plugins declare required permissions in manifest
- Users approve permissions on install (like VS Code extensions)
- Runtime sandbox restricts API access based on granted permissions
- Permissions can be revoked at any time

---

## OpenAPI / Swagger Specification Structure

The API spec lives at `apps/api/openapi/openapi.yaml` and is served at `/api/v1/docs` via Swagger UI.

```yaml
openapi: 3.1.0
info:
  title: CreatorOS API
  version: 0.1.0
  description: Open-source YouTube growth toolkit API
servers:
  - url: https://creatoros.yourdomain.com/api/v1
    description: Self-hosted instance
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
  schemas:
    # All Zod-derived schemas auto-generated for OpenAPI
    # using @asteasolutions/zod-to-openapi
```

Use `zod-to-openapi` to auto-generate the spec from Zod schemas in `@creatoros/shared`.

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm db:generate
      - run: pnpm test

  docker:
    if: github.ref == 'refs/heads/main'
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker/docker-compose.yml build
      - run: docker push ghcr.io/creatoros/api:latest
      # ... per-service pushes
```

---

## Documentation Site

The `apps/docs/` directory runs a Mintlify-based documentation site with:
- **Getting Started:** Installation, configuration, deployment
- **Guides:** Connecting channels, using AI, setting up reports
- **API Reference:** Auto-generated from OpenAPI spec
- **Plugin SDK:** Plugin development guide, API reference
- **Self-Hosting:** Docker, Coolify, Railway, VPS guides
- **Contributing:** Development setup, coding standards

---

## Community & Contribution

```
CONTRIBUTING.md
├── Code of Conduct
├── Setup Development Environment
│   ├── Prerequisites (Node 20, pnpm 9, Docker)
│   ├── Clone & Install
│   ├── Configure Environment Variables
│   ├── Start Database (Docker Compose)
│   └── Run Dev Servers
├── Development Workflow
│   ├── Branch Strategy (trunk-based)
│   ├── Commit Convention (Conventional Commits)
│   ├── Code Style (Prettier + ESLint)
│   └── Testing Requirements
├── Project Structure Guide
├── Adding a New Feature
├── Writing a Plugin (see Plugin SDK docs)
└── Translations / i18n
```

# Security & Performance Protocol

## Authentication & Authorization

### JWT Implementation
```typescript
// packages/config/src/env.ts
const envSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(32), // for YouTube tokens at rest
})
```

### Token Strategy
- **Access token:** 15-minute expiry, signed with RS256 (asymmetric) for multi-service verification
- **Refresh token:** 7-day expiry, stored as httpOnly cookie + database record
- **API keys:** UUID v4 + `scrypt` hash stored; full key shown once
- **Rotation:** Refresh tokens rotated on each use (old one invalidated)

### OAuth 2.0 Flow (YouTube)
```
1. User clicks "Connect YouTube Channel"
2. Backend generates state param (anti-CSRF), stored in Redis (TTL: 10min)
3. User redirected to Google consent screen
4. Google redirects to /api/v1/auth/youtube/callback
5. Backend validates state, exchanges code for tokens
6. Tokens encrypted with AES-256-GCM before DB storage
7. Channel created, first sync triggered
```

### RBAC Structure
```typescript
enum Permission {
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_WRITE = 'analytics:write',
  VIDEOS_READ = 'videos:read',
  VIDEOS_WRITE = 'videos:write',
  KEYWORDS_READ = 'keywords:read',
  KEYWORDS_WRITE = 'keywords:write',
  CHANNEL_MANAGE = 'channel:manage',
  AI_GENERATE = 'ai:generate',
  PLUGINS_MANAGE = 'plugins:manage',
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
}
```

## Data Encryption

| Data At Rest | Method |
|---|---|
| YouTube access/refresh tokens | AES-256-GCM, key in env |
| User passwords | bcrypt (cost 12) |
| Session tokens | SHA-256 hash in DB |
| API keys | scrypt hash |
| Database | Transparent Data Encryption (cloud) or LUKS (VPS) |

### Encryption Utility
```typescript
// packages/shared/src/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

export function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return { encrypted, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex') }
}

export function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
```

## Rate Limiting

### Global (API Gateway)
```typescript
import rateLimit from '@fastify/rate-limit'

app.register(rateLimit, {
  global: true,
  max: 120, // requests per minute
  timeWindow: '1 minute',
  redis: redisClient, // distributed rate limiting
  keyGenerator: (req) => req.user?.id ?? req.ip,
  errorResponseBuilder: () => ({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }),
})
```

### Per-Route Overrides
| Route | Limit | Burst |
|-------|-------|-------|
| `POST /auth/*` | 10/min | 5 |
| `GET /analytics/*` | 60/min | 10 |
| `POST /ai/*` | 20/min | 5 |
| `POST /channels/:id/sync` | 5/min | 2 |
| `GET /extension/*` | 200/min | 20 |

## Input Validation

All inputs validated at gateway level using Zod schemas from `@creatoros/shared`:

```typescript
// packages/shared/src/validators/channel.ts
import { z } from 'zod'

export const connectChannelSchema = z.object({
  youtubeId: z.string().regex(/^UC[a-zA-Z0-9_-]{22}$/),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})

export const videoAnalyticsQuerySchema = z.object({
  period: z.enum(['7d', '28d', '90d', '1y', 'custom']).optional().default('28d'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  channelId: z.string().uuid().optional(),
})
```

## CORS & CSP

```typescript
// api/src/plugins/cors.ts
app.register(cors, {
  origin: [
    process.env.DASHBOARD_URL!, // e.g., https://creatoros.yourdomain.com
    'chrome-extension://*',      // Chrome extension
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})

// apps/web/next.config.js CSP headers
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval for ECharts
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://yt3.ggpht.com",
  "connect-src 'self' https://*.youtube.com https://*.googleapis.com ws://localhost:*",
  "frame-src 'self' https://www.youtube.com",
  "font-src 'self' data:",
]
```

## Performance Optimizations

### Edge-Side Rendering (Next.js)

```
┌─────────────────┐
│  CDN (Cloudflare│
│  or Varnish)    │    Cache static assets, SSR pages
├─────────────────┤
│  Next.js        │    ISR for dashboard pages (revalidate: 60s)
├─────────────────┤
│  API Gateway    │    Redis-cached analytics responses
├─────────────────┤
│  PostgreSQL     │    Materialized views for common queries
└─────────────────┘
```

### Caching Strategy
| Layer | What | TTL | Invalidation |
|-------|------|-----|-------------|
| CDN | Static JS/CSS, fonts | 1 year | Hash-based |
| Next.js (ISR) | Dashboard pages | 60s | On-demand revalidation |
| Redis | Analytics responses | 5min | On sync completion |
| Redis | Session data | 15min | Token refresh |
| Redis | Rate limiter counters | 1min | Sliding window |
| PG (mat views) | Aggregated analytics | 15min | Cron refresh |

### Database Query Optimization
- **N+1 prevention:** Always use Prisma `include` or `select` with relational joins
- **Batch inserts:** Analytics snapshots use `createMany` with `skipDuplicates: true`
- **Pagination:** Cursor-based pagination for video lists and analytics (no `OFFSET`)
- **Partial indexes:** `CREATE INDEX idx_videos_published ON videos(published_at) WHERE status = 'PUBLIC'`

### React Performance
- **Virtual scrolling:** `@tanstack/react-virtual` for video lists and keyword tables (10K+ rows)
- **Component memoization:** `React.memo` + `useMemo` for chart components
- **Dynamic imports:** Route-based code splitting + component-level splitting for heavy charts
- **Web workers:** Retention curve processing offloaded to Web Workers
- **Image optimization:** Next.js `<Image>` with remote patterns for YouTube thumbnails

## Infrastructure Security

### Docker Security
```
docker-compose.yml:
- No root containers (user: node)
- Read-only root filesystem where possible
- Health checks on all services
- Internal network isolation (no port exposure for workers)
- Secrets mounted via files, not env vars (Docker secrets)
```

### Environment Validation
```typescript
// Every service validates env on startup
// packages/config/src/env.ts (uses Zod)
const env = envSchema.parse(process.env) // crashes on missing vars
```

### Audit Logging
```typescript
// All sensitive operations logged
// packages/shared/src/audit.ts
export const AUDIT_ACTIONS = {
  CHANNEL_CONNECT: 'channel.connect',
  CHANNEL_DISCONNECT: 'channel.disconnect',
  VIDEO_UPDATE: 'video.update',
  AI_TASK_CREATE: 'ai.task.create',
  PLUGIN_INSTALL: 'plugin.install',
  EXPORT_DATA: 'export.data',
} as const
```

## Security Checklist

- [ ] JWT with RS256 (asymmetric) for multi-service verification
- [ ] OAuth state parameter validation (anti-CSRF)
- [ ] CORS restricted to known origins
- [ ] Content Security Policy headers set
- [ ] Helmet.js / Fastify helmet plugin for security headers
- [ ] Rate limiting on all endpoints
- [ ] Input validation (Zod) on all API inputs
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (React's default escaping + DOMPurify for rich text)
- [ ] YouTube tokens encrypted at rest
- [ ] Secrets never logged (custom serializers for Fastify)
- [ ] Audit logging for sensitive operations
- [ ] Dependency scanning (Dependabot / Renovate)
- [ ] Container non-root execution
- [ ] API key hashing (scrypt)
- [ ] Session rotation on privilege escalation
- [ ] Brute-force protection (account lockout after 5 failed attempts)

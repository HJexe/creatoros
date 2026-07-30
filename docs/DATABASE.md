# Database Architecture

## Entity Relationship Overview

```
┌─────────┐     ┌───────────┐     ┌───────────────┐
│  User   │1───N│  Channel  │1───N│  Video        │
└─────────┘     └───────────┘     └───────┬───────┘
       │             │                    │
       │             │               ┌────▼───────┐
       │             │               │VideoAnalyt.│
       │             │               └────────────┘
       │             │
       │        ┌────▼────────┐    ┌──────────────┐
       │        │ ChannelAnal │    │  Keyword     │
       │        │ Snapshot    │    └──────┬───────┘
       │        └─────────────┘           │
       │                             ┌────▼───────┐
       │                             │VideoKeyword│
       │                             └────────────┘
       │
  ┌────▼────┐    ┌────────────┐    ┌─────────────┐
  │ AITask  │    │ ContentCal │    │ Competitor  │
  └─────────┘    └────────────┘    └─────────────┘
```

## Key Design Decisions

### Partitioning Strategy
- **`video_analytics`** and **`channel_analytics_snapshots`** will be partitioned by month on `snapshotDate`
- Use PostgreSQL declarative partitioning for time-series data
- Old partitions can be detached and archived

### Indexing Strategy
| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `videos` | `(channel_id, published_at DESC)` | B-tree | Dashboard timeline queries |
| `video_analytics` | `(video_id, snapshot_date)` | B-tree | Unique per-day snapshots |
| `keywords` | `(channel_id, term)` | Unique | One keyword per channel |
| `keyword_rankings` | `(keyword_id, snapshot_date DESC)` | B-tree | Historical ranking tracking |
| `ai_tasks` | `(user_id, status, created_at)` | B-tree | Task queue polling |
| `comments` | `(video_id, published_at DESC)` | B-tree | Comment timeline |
| `trend_data` | `(keyword, date, region)` | B-tree | Trend lookups |
| `videos` | `title` | GIN (trigram) | Full-text search |
| `keywords` | `term` | GIN (trigram) | Prefix/partial matching |

### Materialized Views

```sql
-- channel_daily_summary: refreshed every 15 min via pg_cron
CREATE MATERIALIZED VIEW channel_daily_summary AS
SELECT
  c.id AS channel_id,
  c.user_id,
  DATE(v.published_at) AS date,
  COUNT(DISTINCT v.id) AS videos_published,
  COALESCE(SUM(va.views), 0) AS total_views,
  COALESCE(SUM(va.estimated_minutes_watched), 0) AS total_watch_time,
  COALESCE(AVG(va.average_view_percentage), 0) AS avg_retention
FROM channels c
LEFT JOIN videos v ON v.channel_id = c.id
LEFT JOIN video_analytics va ON va.video_id = v.id
GROUP BY c.id, c.user_id, DATE(v.published_at);

-- keyword_opportunity_scores: refreshed hourly
CREATE MATERIALIZED VIEW keyword_opportunity_scores AS
SELECT
  k.id,
  k.channel_id,
  k.term,
  k.search_volume,
  k.difficulty,
  k.competition,
  -- Formula: (search_volume * (1 - difficulty/100) * (1 - competition)) / max_volume_in_niche
  (k.search_volume * (1 - k.difficulty / 100.0) * (1 - k.competition)) /
    NULLIF(MAX(k.search_volume) OVER (PARTITION BY k.cluster_id), 0) * 100
  AS opportunity_score
FROM keywords k
WHERE k.search_volume IS NOT NULL;
```

### Full-Text Search
Use PostgreSQL `tsvector` columns on `videos.title`, `videos.description`, and `keywords.term` for fast search without external search infrastructure.

## Data Retention

| Data | Retention | Action |
|------|-----------|--------|
| Video analytics snapshots | Indefinite (partitioned) | Auto-partition monthly |
| Channel analytics snapshots | Last 2 years | Detach older partitions |
| AI task logs | 90 days | Auto-delete via cron |
| Sync logs | 30 days | Auto-delete via cron |
| Trend data | 1 year | Rolling deletion |
| Audit logs | 1 year | Archive then delete |
| Notifications | 90 days | Auto-delete read |
| Comments | Indefinite | User-managed |

## Connection Pooling

Use PgBouncer in transaction mode between services and PostgreSQL. Prisma's connection pool should be configured:

```typescript
// packages/database/src/client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // PgBouncer-compatible pooled URL
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## Scaling Considerations

- **Read replicas:** Route Prisma read queries to replicas via `@prisma/extension-read-replicas`
- **Sharding:** Not needed at expected scale (< 1M videos). If needed, shard by `channel_id` hash
- **Caching:** Redis sits in front of analytics queries. Cache key pattern: `analytics:{channelId}:{period}`
- **Vacuum:** Aggressive auto-vacuum configuration recommended for time-series tables

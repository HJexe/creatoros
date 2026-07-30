# CreatorOS API Specification v1

**Base URL:** `/api/v1`  
**Auth:** Bearer JWT or API Key (`Authorization: Bearer <token>`)  
**Content-Type:** `application/json`

## Authentication

### POST /auth/register
Register a new account.
```json
{ "email": "string", "password": "string", "name": "string" }
// → { "user": {}, "token": "jwt..." }
```

### POST /auth/login
```json
{ "email": "string", "password": "string" }
// → { "user": {}, "token": "jwt..." }
```

### POST /auth/oauth
OAuth callback for Google/GitHub.
```json
{ "provider": "google|github", "code": "string" }
// → { "user": {}, "token": "jwt..." }
```

### POST /auth/refresh
```json
{ "refreshToken": "string" }
// → { "token": "jwt...", "refreshToken": "..." }
```

## Channels

### GET /channels
List authenticated user's channels.

### POST /channels
Connect a YouTube channel.
```json
{ "youtubeId": "string", "accessToken": "string", "refreshToken": "string" }
```

### GET /channels/:id
Get channel with latest snapshot metrics.

### DELETE /channels/:id
Disconnect channel (revokes tokens).

### POST /channels/:id/sync
Trigger manual sync.
```json
// → { "syncId": "uuid", "status": "pending" }
```

## Analytics

### GET /channels/:id/analytics/overview
**Query:** `?period=7d|28d|90d|1y|custom&from=date&to=date`
```json
{
  "subscriberGrowth": { "net": 120, "growthRate": 2.3 },
  "views": { "total": 45000, "avgPerVideo": 3200, "growth": 12.5 },
  "watchTime": { "totalMinutes": 185000, "growthRate": 8.1 },
  "revenue": { "estimated": 420.50, "rpm": 2.25, "cpm": 4.80 },
  "topVideos": [ { "id": "uuid", "title": "...", "views": 15000 } ],
  "opportunityScore": 78
}
```

### GET /channels/:id/analytics/videos
Paginated video analytics.
**Query:** `?sort=views|growth|revenue&order=desc&limit=20&offset=0`

### GET /videos/:id/analytics
Detailed single video analytics including retention curve.

### GET /channels/:id/analytics/retention
Aggregate retention heatmap data across video pool.

### GET /channels/:id/analytics/forecast
Growth forecasting using linear regression.
```json
{
  "projectedSubs": { "30d": 1520, "90d": 4890 },
  "confidence": 0.85,
  "basedOn": "last_90d_velocity"
}
```

## SEO & Keywords

### GET /channels/:id/keywords
List tracked keywords with rankings.
**Query:** `?cluster=tech&sort=difficulty&search=term`

### POST /channels/:id/keywords
Add keyword for tracking.
```json
{ "term": "string", "language": "en", "category": "tech" }
```

### DELETE /channels/:id/keywords/:kid
Remove keyword.

### POST /channels/:id/keywords/discover
AI-driven keyword discovery.
```json
{ "seedTerms": ["string"], "maxResults": 20 }
// → { "keywords": [{ "term": "", "volume": 0, "difficulty": 0, "opportunity": 0 }], "clusters": [] }
```

### GET /channels/:id/keywords/clusters
Get keyword clusters with opportunity scoring.

### GET /channels/:id/keywords/trends
Get trending keywords in channel's niche.
**Query:** `?period=7d|30d`

## Videos

### GET /videos
List all videos across channels.
**Query:** `?channelId=&status=&sort=publishedAt&limit=&offset=`

### GET /videos/:id
Full video detail with analytics and keywords.

### PATCH /videos/:id
Update metadata (notes, stage, tags).

### POST /videos/:id/seo
Generate SEO suggestions for video.
```json
// → { "titles": ["..."], "description": "optimized...", "tags": ["..."], "seoScore": 85 }
```

### POST /videos/:id/thumbnail/analyze
Analyze thumbnail image (base64 or URL).
```json
{ "imageUrl": "string" | "imageBase64": "string" }
// → { "score": 72, "contrast": 0.65, "textDetected": true, "gazeHeatmap": "...", "suggestions": ["Increase contrast", "Move subject center"] }
```

## AI Tools

### POST /ai/title
Generate title variants.
```json
{ "videoDescription": "...", "targetKeywords": ["..."], "tone": "educational|entertaining|controversial|informative", "count": 10 }
// → { "titles": [{ "title": "string", "score": 85, "reasons": ["keyword rich", "high ctr pattern"] }] }
```

### POST /ai/description
Optimize video description.
```json
{ "currentDescription": "...", "targetKeyword": "string", "videoTranscript": "..." }
// → { "description": "...", "seoScore": 92, "keywordDensity": 0.02 }
```

### POST /ai/script
Generate video script.
```json
{ "topic": "string", "duration_minutes": 10, "tone": "educational", "targetAudience": "beginners", "includeCTA": true }
// → { "script": "...", "sections": [{ "timestamp": "0:00", "content": "", "visualNotes": "" }] }
```

### POST /ai/comments/suggest
Generate reply suggestions for comments.
```json
{ "commentText": "string", "videoContext": "string", "channelTone": "friendly|professional|humorous" }
// → { "suggestions": ["string"] }
```

### GET /ai/tasks
List AI task history/status.
**Query:** `?type=TITLE_GENERATION&status=COMPLETED&limit=20`

### GET /ai/tasks/:id
Get task result with token usage and latency.

## Competitors

### GET /channels/:id/competitors
List tracked competitors.

### POST /channels/:id/competitors
Add competitor channel.
```json
{ "youtubeId": "string" }
```

### DELETE /channels/:id/competitors/:cid
Remove competitor.

### GET /channels/:id/competitors/:cid/analysis
Detailed competitor report with velocity, topic overlap, growth comparison.

### GET /channels/:id/competitors/gap-analysis
Content gap analysis — topics your competitors cover that you don't.

## Content Calendar

### GET /calendar
List calendar items.
**Query:** `?stage=backlog&from=date&to=date&status=idea`

### POST /calendar
Create calendar item.
```json
{ "title": "string", "scheduledDate": "date", "stage": "this-week", "priority": "medium", "labels": ["string"] }
```

### PATCH /calendar/:id
Update item (move between stages, reschedule).

### DELETE /calendar/:id
Delete item.

### POST /calendar/reorder
Batch reorder items within a stage.
```json
{ "stage": "this-week", "order": ["id1", "id2", "id3"] }
```

## Reports

### POST /reports
Generate a report.
```json
{ "type": "weekly", "format": "pdf", "channels": ["id1"], "dateRange": { "from": "date", "to": "date" } }
// → { "reportId": "uuid", "status": "generating" }
```

### GET /reports/:id/download
Download generated report file.

## Notifications & Webhooks

### GET /notifications
List notifications.
**Query:** `?unread=true&limit=50`

### PATCH /notifications/:id/read
Mark as read.

### POST /notifications/read-all
Mark all as read.

### GET /webhooks
List configured webhooks.

### POST /webhooks
Create webhook.
```json
{ "url": "string", "events": ["video.published"], "channel": "DISCORD", "name": "My Discord" }
```

### DELETE /webhooks/:id
Delete webhook.

## Plugins (SDK)

### GET /plugins
List installed plugins with status.

### POST /plugins/install
Install plugin.
```json
{ "packageName": "@creatoros/plugin-analytics-export", "source": "npm", "version": "latest" }
```

### PATCH /plugins/:id/config
Update plugin config.
```json
{ "key": "apiKey", "value": "..." }
```

### DELETE /plugins/:id
Uninstall plugin.

## Trends

### GET /trends/search
Get trend data for a keyword.
**Query:** `?keyword=ai+video&region=US&period=90d`

### GET /trends/rising
Get rising trends in a niche.
**Query:** `?category=tech&region=US`

## Error Handling

All errors follow a consistent schema:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
```

**Common codes:** `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `AI_PROVIDER_ERROR`, `YOUTUBE_API_ERROR`, `SYNC_IN_PROGRESS`

## Rate Limiting

| Endpoint Group | Limit |
|---------------|-------|
| Auth endpoints | 10 req/min |
| Analytics reads | 60 req/min |
| AI generation | 20 req/min |
| YouTube sync | 5 req/min |
| General API | 120 req/min |

Returned headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

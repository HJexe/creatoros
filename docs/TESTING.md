# CreatorOS — Testing with YouTube URLs

## Overview

The **Video Evaluator** (`@creatoros/video-evaluator`) is a standalone CLI tool that analyzes any YouTube video or channel by URL. It runs the full CreatorOS analysis pipeline — SEO scoring, thumbnail analysis, keyword extraction, and AI-powered suggestions — against a single YouTube URL, no account or database required.

```
INPUT: YouTube URL ──► CreatorOS Evaluator ──► SCORES + REPORT
                    │                      │
                    ├─ YouTube Data API    ├─ SEO Score (0-100)
                    ├─ Pixel Analysis      ├─ Thumbnail Score (0-100)
                    ├─ NLP Keyword Engine  ├─ Keyword Opportunity (0-100)
                    └─ AI (optional)       └─ Overall Score (0-100)
```

## Quick Start

### 1. Prerequisites

- **Node.js >= 20** — [Download](https://nodejs.org)
- **pnpm >= 9** — Install: `corepack enable && corepack prepare pnpm@9 --activate`
- **YouTube Data API Key** — Get one at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### 2. Setup

```bash
# Navigate to the project
cd creatoros

# Install dependencies
pnpm install

# Navigate to the video-evaluator app
cd apps/video-evaluator

# Create .env from template
cp .env.example .env

# Edit .env and add your YouTube API key
# YOUTUBE_API_KEY=AIzaSy...
```

### 3. Run Your First Evaluation

```bash
# Analyze a specific video
pnpm eval "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Analyze by video ID
pnpm eval "dQw4w9WgXcQ"

# Analyze a channel's recent videos
pnpm eval "https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"

# Analyze by handle
pnpm eval "@mkbhd"
```

## Command Reference

```bash
pnpm eval <url> [options]

Arguments:
  url              YouTube URL, video ID (11 chars), channel ID (UC...), or @handle

Options:
  -f, --format <type>     Output format: cli (default), json, html
  -o, --output <file>     Write output to file (required for JSON, optional for HTML)
  --ai-provider <name>    AI provider: openai, anthropic, google, ollama, none (default)
  --verbose               Show detailed debug info
  --help                  Display help
```

## Input Types

The evaluator accepts several input formats:

| Format | Example | Detects |
|--------|---------|---------|
| Full URL (video) | `https://youtube.com/watch?v=dQw4w9WgXcQ` | Video analysis |
| Short URL | `https://youtu.be/dQw4w9WgXcQ` | Video analysis |
| Video ID | `dQw4w9WgXcQ` | Video analysis |
| Full URL (channel) | `https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw` | Channel analysis (evaluates latest video) |
| Handle | `@mkbhd` | Channel analysis by handle |
| Channel ID | `UC_x5XG1OV2P6uZZ5FSM9Ttw` | Channel analysis |

## Output Formats

### CLI (default)

```
╔══════════════════════════════════════════════════════════════╗
║              CreatorOS — Video Evaluation Report           ║
╚══════════════════════════════════════════════════════════════╝

  ✓  OVERALL OPPORTUNITY SCORE: 74/100
     Analysis completed in 843ms

  ┌─ Video ──────────────────────────────────────────────────┐
  │  Title:      Rick Astley - Never Gonna Give You Up (Offic
  │  Channel:    Rick Astley
  │  Duration:   3:33  |  Views: 1.5B  |  Likes: 18.0M
  │  Published:  2009-10-24
  │  Tags:       Rick Astley, Never Gonna Give You Up, ...
  └──────────────────────────────────────────────────────────┘
  ...
```

### JSON

```bash
pnpm eval "dQw4w9WgXcQ" --format json --output report.json
```

Produces structured data suitable for programmatic consumption. Includes all scores, details, keyword rankings, and AI suggestions.

### HTML

```bash
pnpm eval "dQw4w9WgXcQ" --format html
```

Generates a self-contained HTML report with styled cards, progress bars, color swatches, and full analysis breakdown. Opens in any browser.

```bash
pnpm eval "dQw4w9WgXcQ" --format html --output report.html
```

## Evaluation Modules

### 1. SEO Analyzer

Scores the video's title, description, and tags against YouTube best practices:

| Factor | Weight | What it checks |
|--------|--------|----------------|
| Title length | 15% | 30-70 characters optimal |
| Front-loading | 5% | Keywords in first 40 chars |
| Power words | 5% | Emotional/urgency triggers |
| Numbers | 5% | Lists and digits boost CTR |
| Description length | 20% | 200+ chars, 5000 max |
| Above-fold content | 10% | Substance in first 2 lines |
| Timestamps | 8% | Chapter markers improve UX |
| Hashtags | 3% | 1-3 relevant hashtags |
| Tag count | 10% | 10-20 tags optimal |
| Title alignment | 8% | Tags match title keywords |
| Phrase tags | 5% | Multi-word tags for long-tail |

### 2. Thumbnail Analyzer

Analyzes the thumbnail image using pixel-level computer vision:

| Metric | Range | Target |
|--------|-------|--------|
| Brightness | 0-100% | 40-80% |
| Contrast | 0-1.0 | > 0.35 |
| Saturation | 0-1.0 | > 0.4 |
| Face detection | Detected/Not | Face detected |
| Text detection | Ratio 0-0.5 | Text present, < 25% frame |
| Color diversity | Top 5 colors | 3+ distinct color clusters |
| Skin-tone ratio | % of frame | > 2% suggests face present |

### 3. Keyword Extractor

Extracts and scores keywords from title, description, and tags:

- **N-gram extraction:** Unigrams, bigrams, and trigrams
- **Stop word filtering:** Common English words excluded
- **Relevance scoring:** Based on frequency, title/tag alignment, and phrase length
- **Difficulty estimation:** Short/generic = harder, long-tail = easier
- **Niche detection:** Maps keywords to known YouTube categories (tech, gaming, education, etc.)
- **Opportunity scoring:** `relevance * (1 - difficulty/100) * (1 - competition)`

The `opportunityScore` aggregates across the top 15 keywords to produce a 0-100 overall opportunity metric.

### 4. AI Suggester (Optional)

When an AI provider API key is configured, generates:

- **Title variants:** 5 optimized alternatives with reasoning
- **Description rewrite:** SEO-optimized full description
- **Tag suggestions:** 15-20 recommended tags
- **Analysis:** 2-3 paragraph expert critique

Without an AI key, rule-based suggestions are generated instead.

#### Configure AI Providers

```bash
# In apps/video-evaluator/.env:
OPENAI_API_KEY=sk-...          # GPT-4o-mini
ANTHROPIC_API_KEY=sk-ant-...   # Claude 3 Haiku
GOOGLE_AI_API_KEY=...           # Gemini 2.0 Flash
OLLAMA_BASE_URL=http://...:11434  # Local Llama 3

# Then run with:
pnpm eval "dQw4w9WgXcQ" --ai-provider openai
```

## Understanding the Scores

### Overall Opportunity Score (0-100)

Weighted composite:
- **30%** — SEO Score (title, description, tags optimization)
- **20%** — Thumbnail Score (visual quality, face/text detection)
- **35%** — Keyword Opportunity (search volume potential / competition)
- **15%** — Bonus for keyword-rich content

**Interpretation:**
| Range | Meaning |
|-------|---------|
| 80-100 | Excellent — Well-optimized for discovery |
| 60-79 | Good — Minor tweaks can improve performance |
| 40-59 | Fair — Significant optimization opportunities |
| 0-39 | Poor — Needs substantial rework on multiple fronts |

### Score Limitations

- Keyword volume/difficulty are **estimates** based on heuristics, not real Google Keyword Planner data
- Thumbnail analysis uses **basic pixel analysis** (brightness, contrast, skin-tone detection). Full OpenCV integration would add face detection, OCR, and gaze tracking
- AI suggestions require **paid API keys** for cloud providers
- The tool uses the **free YouTube Data API** which has daily quotas (10,000 units/day)

## Batch Mode

Evaluate multiple URLs at once:

```bash
# Create a JSON file:
# [
#   { "url": "https://youtu.be/dQw4w9WgXcQ", "label": "Never Gonna" },
#   { "url": "https://youtu.be/jNQXAC9IVRw", "label": "Me at the zoo" }
# ]

pnpm batch urls.json results.json
```

Or a plain text file (one URL per line):

```bash
# urls.txt:
# https://youtu.be/dQw4w9WgXcQ
# https://youtu.be/jNQXAC9IVRw

pnpm batch urls.txt results.json
```

Output is a JSON file with sorted results:

```json
{
  "summary": {
    "total": 10,
    "avgScore": 65,
    "topScore": 91
  },
  "results": [
    { "url": "...", "overallScore": 91, "seoScore": 88, "thumbnailScore": 85, "keywordScore": 76 },
    ...
  ]
}
```

## Demo Mode

Run the demo with sample URLs:

```bash
# Without API key (shows instructions):
pnpm demo

# With API key (runs against sample videos):
pnpm demo
```

## YouTube Data API Quota

The free YouTube Data API v3 quota is **10,000 units/day**:

| Operation | Cost |
|-----------|------|
| Video list (single video) | 1 unit |
| Channel list | 1 unit |
| Search (channel videos) | 100 units |
| Comment threads | 1 unit |

A single video evaluation typically costs **3-5 units**. A channel evaluation with 10 recent videos costs **~105 units**.

## Troubleshooting

### "YOUTUBE_API_KEY environment variable is required"

```bash
# Create .env file in apps/video-evaluator/
echo "YOUTUBE_API_KEY=AIzaSy..." > apps/video-evaluator/.env
```

### "Video not found"

- Verify the video exists (not private, deleted, or age-restricted)
- Check the URL/ID for typos
- Some videos may be blocked in certain regions

### "Channel not found"

- Verify the channel ID starts with `UC`
- Handles require the `@` prefix: `@mkbhd` not `mkbhd`

### "Quota exceeded"

- The YouTube Data API has a daily quota
- Wait 24 hours or create additional API keys

### Slow AI responses

- Rule-based mode (no AI key) completes in < 1 second
- AI-powered mode depends on the provider's latency
- Consider using `--ai-provider ollama` for local, fast responses

## Testing the Full Stack

To test the complete CreatorOS stack (dashboard + API + database):

```bash
# From the project root
pnpm install
docker compose -f docker/docker-compose.yml up -d postgres redis minio
pnpm db:migrate
pnpm dev
```

This starts:
- **Web dashboard:** http://localhost:3000
- **API:** http://localhost:3001
- **API docs:** http://localhost:3001/docs

The video evaluator works independently — it does not require the database or dashboard to run.

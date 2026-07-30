import type { YouTubeVideoData } from './youtube-fetcher.js'

export interface SEOResult {
  score: number
  titleScore: number
  descriptionScore: number
  tagsScore: number
  details: SEODetail[]
  suggestions: string[]
}

interface SEODetail {
  category: 'title' | 'description' | 'tags' | 'metadata'
  field: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  weight: number
}

export class SEOAnalyzer {
  private maxTitleLength = 70
  private maxDescriptionLength = 5000

  analyze(video: YouTubeVideoData): SEOResult {
    const details: SEODetail[] = []
    const suggestions: string[] = []

    // ── Title Analysis ──
    const titleAnalysis = this.analyzeTitle(video.title)
    details.push(...titleAnalysis.details)
    suggestions.push(...titleAnalysis.suggestions)

    // ── Description Analysis ──
    const descAnalysis = this.analyzeDescription(video.description)
    details.push(...descAnalysis.details)
    suggestions.push(...descAnalysis.suggestions)

    // ── Tags Analysis ──
    const tagAnalysis = this.analyzeTags(video.tags, video.title, video.description)
    details.push(...tagAnalysis.details)
    suggestions.push(...tagAnalysis.suggestions)

    // ── Compute weighted score ──
    const score = this.computeScore(details)

    return { score, titleScore: 0, descriptionScore: 0, tagsScore: 0, details, suggestions }
  }

  private analyzeTitle(title: string): { details: SEODetail[]; suggestions: string[] } {
    const details: SEODetail[] = []
    const suggestions: string[] = []
    const length = title.length

    // Length check
    if (length === 0) {
      details.push({ category: 'title', field: 'length', status: 'fail', message: 'Title is empty', weight: 15 })
      suggestions.push('Add a compelling title between 30-60 characters')
    } else if (length < 30) {
      details.push({ category: 'title', field: 'length', status: 'warn', message: `Title is short (${length} chars). Optimal: 30-60 characters.`, weight: 10 })
      suggestions.push(`Expand your title (currently ${length} chars). 30-60 characters is ideal for YouTube.`)
    } else if (length <= this.maxTitleLength) {
      details.push({ category: 'title', field: 'length', status: 'pass', message: `Title length is optimal (${length} chars)`, weight: 15 })
    } else {
      details.push({ category: 'title', field: 'length', status: 'warn', message: `Title may be truncated at ${length} chars (max ${this.maxTitleLength} displayed)`, weight: 10 })
      suggestions.push(`Title is ${length} characters. YouTube typically displays ~70 characters before truncating.`)
    }

    // Front-loading check (keywords in first 40 chars)
    if (length > 40) {
      details.push({ category: 'title', field: 'frontLoad', status: 'pass', message: 'Keywords have room in the first 40 characters', weight: 5 })
    }

    // Number/List check
    if (/\d+/.test(title)) {
      details.push({ category: 'title', field: 'numbers', status: 'pass', message: 'Title contains numbers (can boost CTR)', weight: 5 })
    } else {
      details.push({ category: 'title', field: 'numbers', status: 'warn', message: 'No numbers in title. Lists and numbered content often perform better.', weight: 3 })
    }

    // Clickbait/power words
    const powerWords = ['ultimate', 'best', 'top', 'guide', 'how to', 'easy', 'simple', 'complete', 'essential', 'proven', 'expert', 'advanced', 'beginner', 'tutorial', 'tips', 'tricks', 'vs', 'review', '2024', '2025', '2026']
    const foundPower = powerWords.filter(w => title.toLowerCase().includes(w))
    if (foundPower.length > 0) {
      details.push({ category: 'title', field: 'powerWords', status: 'pass', message: `CTY-boosting words detected: ${foundPower.slice(0, 3).join(', ')}`, weight: 5 })
    } else {
      details.push({ category: 'title', field: 'powerWords', status: 'warn', message: 'No power words found. Consider adding emotional/urgency triggers.', weight: 3 })
    }

    // Cardinal numbers (1-9 vs 10+)
    const singleDigit = title.match(/\b[0-9]\b/)
    if (singleDigit) {
      details.push({ category: 'title', field: 'oddNumber', status: 'pass', message: 'Odd numbers in titles can increase CTR', weight: 3 })
    }

    return { details, suggestions }
  }

  private analyzeDescription(description: string): { details: SEODetail[]; suggestions: string[] } {
    const details: SEODetail[] = []
    const suggestions: string[] = []
    const length = description.length

    if (length === 0) {
      details.push({ category: 'description', field: 'length', status: 'fail', message: 'Description is empty', weight: 20 })
      suggestions.push('Add a detailed description (200+ characters) with keywords to improve search ranking.')
    } else if (length < 200) {
      details.push({ category: 'description', field: 'length', status: 'warn', message: `Description is short (${length} chars). 200+ recommended.`, weight: 15 })
      suggestions.push(`Expand your description (currently ${length} chars). Aim for 200-5000 characters with keywords in the first 2 lines.`)
    } else {
      details.push({ category: 'description', field: 'length', status: 'pass', message: `Description length is good (${length} chars)`, weight: 20 })
    }

    // First 2 lines contain keywords
    const firstLines = description.split('\n').slice(0, 2).join(' ').toLowerCase()
    if (firstLines.length > 50) {
      details.push({ category: 'description', field: 'aboveFold', status: 'pass', message: 'Content in the visible "above the fold" area', weight: 10 })
    }

    // Link presence
    if (description.includes('http')) {
      details.push({ category: 'description', field: 'links', status: 'pass', message: 'Contains links (social, affiliate, etc.)', weight: 5 })
    }

    // Timestamp/Chapter markers
    const timestampRegex = /\d{1,2}:\d{2}/g
    const timestamps = description.match(timestampRegex)
    if (timestamps && timestamps.length >= 3) {
      details.push({ category: 'description', field: 'timestamps', status: 'pass', message: `Chapter markers detected (${timestamps.length} timestamps)`, weight: 8 })
    } else if (length > 500) {
      details.push({ category: 'description', field: 'timestamps', status: 'warn', message: 'No chapter markers found. Timestamps improve UX and SEO.', weight: 5 })
      suggestions.push('Add chapter markers with timestamps (0:00, 2:30, etc.) in the description.')
    }

    // Hashtag usage
    const hashtags = description.match(/#\w+/g)
    if (hashtags && hashtags.length > 0) {
      details.push({ category: 'description', field: 'hashtags', status: 'pass', message: `Hashtags used: ${hashtags.length} found`, weight: 3 })
      if (hashtags.length > 3) {
        details.push({ category: 'description', field: 'hashtags', status: 'warn', message: `More than 3 hashtags. YouTube displays exactly 3 above the title.`, weight: 2 })
      }
    } else {
      details.push({ category: 'description', field: 'hashtags', status: 'warn', message: 'No hashtags in description. Use 1-3 relevant hashtags.', weight: 2 })
    }

    return { details, suggestions }
  }

  private analyzeTags(tags: string[], title: string, description: string): { details: SEODetail[]; suggestions: string[] } {
    const details: SEODetail[] = []
    const suggestions: string[] = []

    if (!tags || tags.length === 0) {
      details.push({ category: 'tags', field: 'count', status: 'fail', message: 'No tags provided', weight: 10 })
      suggestions.push('Add 10-20 relevant tags. Include variations, synonyms, and common misspellings.')
      return { details, suggestions }
    }

    // Tag count
    if (tags.length >= 10 && tags.length <= 20) {
      details.push({ category: 'tags', field: 'count', status: 'pass', message: `Tag count is optimal (${tags.length} tags)`, weight: 10 })
    } else if (tags.length < 10) {
      details.push({ category: 'tags', field: 'count', status: 'warn', message: `Only ${tags.length} tags. 10-20 recommended for maximum discovery.`, weight: 7 })
      suggestions.push(`Add more tags (currently ${tags.length}). Shoot for 10-20 relevant tags.`)
    } else {
      details.push({ category: 'tags', field: 'count', status: 'warn', message: `${tags.length} tags. YouTube ignores tags beyond ~20.`, weight: 7 })
    }

    // Title keyword in tags
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const matchedInTitle = titleWords.filter(w => tags.some(t => t.toLowerCase().includes(w)))
    if (matchedInTitle.length > 0) {
      details.push({ category: 'tags', field: 'titleAlignment', status: 'pass', message: `Tags align with title (${matchedInTitle.length} matches)`, weight: 8 })
    } else {
      details.push({ category: 'tags', field: 'titleAlignment', status: 'warn', message: 'No tags match your title keywords. This hurts relevance signals.', weight: 5 })
      suggestions.push('Your tags should include the core keywords from your title.')
    }

    // Phrase tags (multi-word)
    const phraseTags = tags.filter(t => t.includes(' '))
    if (phraseTags.length >= 3) {
      details.push({ category: 'tags', field: 'phrases', status: 'pass', message: `${phraseTags.length} phrase tags found (good for long-tail search)`, weight: 5 })
    } else {
      details.push({ category: 'tags', field: 'phrases', status: 'warn', message: 'Few phrase tags. Use 3-5 multi-word tags for long-tail SEO.', weight: 3 })
    }

    return { details, suggestions }
  }

  private computeScore(details: SEODetail[]): number {
    let totalWeight = 0
    let earned = 0

    for (const d of details) {
      totalWeight += d.weight
      switch (d.status) {
        case 'pass': earned += d.weight; break
        case 'warn': earned += d.weight * 0.5; break
        case 'fail': earned += 0; break
      }
    }

    return Math.round((earned / Math.max(totalWeight, 1)) * 100)
  }
}

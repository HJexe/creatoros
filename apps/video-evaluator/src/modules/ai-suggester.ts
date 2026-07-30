import type { YouTubeVideoData } from './youtube-fetcher.js'
import type { ThumbnailResult } from './thumbnail-analyzer.js'
import type { SEOResult } from './seo-analyzer.js'
import type { KeywordResult } from './keyword-extractor.js'

export interface AISuggestions {
  titles: { title: string; reasoning: string }[]
  description: string
  tags: string[]
  analysis: string
  error?: string
}

export class AISuggester {
  private apiKey: string
  private provider: string
  private baseUrl: string

  constructor(provider: string) {
    this.provider = provider
    this.apiKey = process.env[`${provider.toUpperCase()}_API_KEY`] ?? ''
    this.baseUrl = provider === 'ollama'
      ? (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434')
      : ''
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0 || this.provider === 'ollama'
  }

  generateTitleVariants(video: YouTubeVideoData): AISuggestions['titles'] {
    const titleLower = video.title.toLowerCase()
    const keywordsMatched = (video.tags ?? []).filter(t => titleLower.includes(t.toLowerCase())).slice(0, 5)

    const templates = [
      `How to ${video.title}: Complete ${this.detectNicheWord(video)} Guide`,
      `${video.title} — Everything You Need to Know (${new Date().getFullYear()})`,
      `I Tried ${video.title} and Here's What Happened`,
      `The Ultimate ${video.title} Tutorial for Beginners`,
      `${video.title} Review: Is It Worth It?`,
      `Top 10 ${video.title} Tips You Don't Want to Miss`,
      `${video.title} Explained in Under 5 Minutes`,
      `Why ${video.title} Is Taking Over ${this.detectNicheWord(video)}`,
      `${video.title} vs The Competition — Which is Better?`,
      `${this.getPowerWord()} ${video.title} That Will Blow Your Mind`,
    ]

    return templates.map((title, i) => ({
      title,
      reasoning: [
        'Includes front-loaded keywords for search visibility',
        'Uses proven CTR-boosting pattern (list, question, comparison)',
        'Contains emotional trigger or curiosity gap',
        'Optimized for suggested video placement',
        'Incorporates trending power words',
      ][i % 5] ?? '',
    }))
  }

  generateDescription(video: YouTubeVideoData): string {
    const tagsLower = (video.tags ?? []).slice(0, 5)
    const dateStr = new Date().toISOString().split('T')[0]
    return `${video.title}

In this video, we dive deep into ${video.title.toLowerCase()}. Whether you're a beginner or an expert, you'll find valuable insights and actionable tips.

📌 What you'll learn:
• ${this.extractKeyPhrase(video.description, 0)}
• ${this.extractKeyPhrase(video.description, 1)}
• ${this.extractKeyPhrase(video.description, 2)}
• ${this.extractKeyPhrase(video.description, 3)}

📚 Resources & Links:
[Add relevant links here]

⏱️ Timestamps:
0:00 — Introduction
${this.generateTimestamps(video)}

🔔 Don't forget to LIKE 👍, COMMENT 💬, and SUBSCRIBE 🔴 for more ${this.detectNicheWord(video)} content!

#${tagsLower.slice(0, 3).join(' ').replace(/\s+/g, ' #')}

📅 Published: ${dateStr}`
  }

  generateTags(video: YouTubeVideoData): string[] {
    const existing = new Set((video.tags ?? []).map(t => t.toLowerCase()))
    const suggestions = new Set<string>()

    // Add title words as tags
    const titleWords = video.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    for (const word of titleWords) {
      if (!existing.has(word)) suggestions.add(word)
    }

    // Add bigrams from title
    for (let i = 0; i < titleWords.length - 1; i++) {
      const bigram = `${titleWords[i]} ${titleWords[i + 1]}`
      if (!existing.has(bigram)) suggestions.add(bigram)
    }

    // Add niche-specific tags
    const nicheTags = this.getNicheTags(video.title)
    for (const tag of nicheTags) {
      if (!existing.has(tag.toLowerCase())) suggestions.add(tag)
    }

    // Add "how to" variants
    suggestions.add(`how to ${video.title.toLowerCase()}`)
    suggestions.add(`${video.title.toLowerCase()} tutorial`)
    suggestions.add(`${video.title.toLowerCase()} ${new Date().getFullYear()}`)

    return Array.from(suggestions).slice(0, 20)
  }

  generateAnalysis(video: YouTubeVideoData, seo: SEOResult, thumbnail: ThumbnailResult, keywords: KeywordResult): string {
    const parts: string[] = []
    parts.push(`📊 **Video Analysis Report for "${video.title}"**`)
    parts.push('')
    parts.push(`**Overall Assessment:** ${this.overallAssessment(seo.score, thumbnail.score, keywords.opportunityScore)}`)
    parts.push('')
    parts.push(`**SEO Score:** ${seo.score}/100 — ${seo.score >= 70 ? 'Good' : seo.score >= 50 ? 'Needs Improvement' : 'Poor'}`)
    parts.push(`**Thumbnail Score:** ${thumbnail.score}/100`)
    parts.push(`**Keyword Opportunity:** ${keywords.opportunityScore}/100`)
    parts.push(`**Content Niche:** ${keywords.clusterName ?? 'General'}`)
    parts.push('')
    parts.push(`**Top Keywords to Target:**`)
    for (const kw of keywords.extractedKeywords.slice(0, 5)) {
      parts.push(`  • "${kw.term}" — Relevance: ${kw.relevance}/100, Difficulty: ${kw.difficulty}/100`)
    }
    parts.push('')
    parts.push(`**Suggested Actions:**`)
    if (seo.score < 70) {
      const topSuggestions = seo.suggestions.slice(0, 3)
      for (const s of topSuggestions) parts.push(`  • ${s}`)
    }
    if (thumbnail.score < 65) {
      const thumbSugg = thumbnail.suggestions.slice(0, 3)
      for (const s of thumbSugg) parts.push(`  • ${s}`)
    }
    if (keywords.opportunityScore < 50 && keywords.extractedKeywords.length > 0) {
      parts.push(`  • Target specific long-tail keywords like "${keywords.extractedKeywords[0]?.term}"`)
    }
    parts.push('')
    parts.push(`💡 **Opportunity Score:** ${keywords.opportunityScore}/100 — ${keywords.opportunityScore >= 60 ? 'Strong potential for growth' : 'Room for improvement in keyword targeting'}`)

    return parts.join('\n')
  }

  private detectNicheWord(video: YouTubeVideoData): string {
    const niches = ['tech', 'gaming', 'cooking', 'travel', 'fitness', 'music', 'education', 'entertainment']
    const combined = `${video.title} ${video.description} ${(video.tags ?? []).join(' ')}`.toLowerCase()
    for (const niche of niches) {
      if (combined.includes(niche)) return niche
    }
    return 'content'
  }

  private extractKeyPhrase(text: string, index: number): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
    const phrase = sentences[index] || sentences[sentences.length - 1] || 'Key insights and practical tips'
    return phrase.trim().substring(0, 80)
  }

  private generateTimestamps(video: YouTubeVideoData): string {
    const duration = video.durationSeconds
    if (duration < 120) return ''
    const segments = Math.min(Math.floor(duration / 120), 8)
    const lines: string[] = []
    for (let i = 1; i <= segments; i++) {
      const sec = i * Math.floor(duration / (segments + 1))
      const min = Math.floor(sec / 60)
      const s = sec % 60
      lines.push(`${min}:${String(s).padStart(2, '0')} — Section ${i}`)
    }
    return lines.join('\n')
  }

  private getPowerWord(): string {
    const words = ['Amazing', 'Incredible', 'Ultimate', 'Essential', 'Proven', 'Expert', 'Simple', 'Powerful', 'Effective', 'Secret']
    return words[Math.floor(Math.random() * words.length)]!
  }

  private getNicheTags(title: string): string[] {
    const tags: string[] = []
    const lower = title.toLowerCase()
    const nicheMap: Record<string, string[]> = {
      'tutorial': ['beginner friendly', 'step by step', 'learn'],
      'review': ['honest review', 'worth it', 'best'],
      'vs': ['comparison', 'which is better', 'difference'],
      'how to': ['tutorial', 'diy', 'guide'],
      'top': ['best of', 'ranking', 'list'],
    }
    for (const [keyword, related] of Object.entries(nicheMap)) {
      if (lower.includes(keyword)) tags.push(...related)
    }
    return tags
  }

  private overallAssessment(seoScore: number, thumbScore: number, kwScore: number): string {
    const avg = (seoScore + thumbScore + kwScore) / 3
    if (avg >= 75) return 'This video is well-optimized for discovery. Minor tweaks can further boost performance.'
    if (avg >= 55) return 'Decent foundation but significant optimization opportunities exist in SEO and keyword targeting.'
    return 'Substantial optimization needed. Review the detailed suggestions below for each area.'
  }

  async generateWithAI(video: YouTubeVideoData): Promise<AISuggestions> {
    if (!this.isAvailable()) {
      return {
        titles: this.generateTitleVariants(video),
        description: this.generateDescription(video),
        tags: this.generateTags(video),
        analysis: `AI-powered analysis not available. Install an AI provider (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.) and rerun with --ai-provider.

These rule-based suggestions were generated instead:

• ${this.generateTitleVariants(video).slice(0, 3).map(t => t.title).join('\n• ')}`,
      }
    }

    const prompt = `You are a YouTube SEO expert. Analyze this video and provide optimizations.

Title: ${video.title}
Description: ${video.description.substring(0, 1000)}
Tags: ${(video.tags ?? []).join(', ')}
Duration: ${video.duration}
Views: ${video.viewCount.toLocaleString()}
Likes: ${video.likeCount.toLocaleString()}

Respond in JSON with:
1. "titles": array of 5 optimized title variants with "reasoning" for each
2. "description": a rewritten, SEO-optimized description (200-300 words)
3. "tags": array of 15-20 recommended tags
4. "analysis": A 2-3 paragraph analysis of the video's current optimization`

    try {
      const result = await this.callLLM(prompt)
      const parsed = JSON.parse(result)
      return {
        titles: parsed.titles ?? this.generateTitleVariants(video),
        description: parsed.description ?? this.generateDescription(video),
        tags: parsed.tags ?? this.generateTags(video),
        analysis: parsed.analysis ?? 'AI analysis completed.',
      }
    } catch (err) {
      return {
        titles: this.generateTitleVariants(video),
        description: this.generateDescription(video),
        tags: this.generateTags(video),
        analysis: this.generateAnalysis(video,
          { score: 0, titleScore: 0, descriptionScore: 0, tagsScore: 0, details: [], suggestions: [] },
          { score: 0, brightness: 0, contrast: 0, saturation: 0, faceDetected: false, textDetected: false, textRatio: 0, dominantColors: [], suggestions: [] },
          { extractedKeywords: [], suggestedTags: [], clusterName: null, opportunityScore: 0, searchVolumeEstimate: 0, competitionEstimate: 0, difficultyEstimate: 0 },
        ),
        error: `AI generation failed: ${(err as Error).message}`,
      }
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    switch (this.provider) {
      case 'openai':
        return this.callOpenAI(prompt)
      case 'anthropic':
        return this.callAnthropic(prompt)
      case 'google':
        return this.callGoogle(prompt)
      case 'ollama':
        return this.callOllama(prompt)
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`)
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })
    const data = await res.json() as any
    return data.choices?.[0]?.message?.content ?? ''
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json() as any
    return data.content?.[0]?.text ?? ''
  }

  private async callGoogle(prompt: string): Promise<string> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    const data = await res.json() as any
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  private async callOllama(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3', messages: [{ role: 'user', content: prompt }], stream: false }),
    })
    const data = await res.json() as any
    return data.message?.content ?? ''
  }
}

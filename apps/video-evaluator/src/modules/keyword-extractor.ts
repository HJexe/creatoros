import type { YouTubeVideoData } from './youtube-fetcher.js'

export interface KeywordResult {
  extractedKeywords: ScoredKeyword[]
  suggestedTags: string[]
  clusterName: string | null
  opportunityScore: number
  searchVolumeEstimate: number
  competitionEstimate: number
  difficultyEstimate: number
}

export interface ScoredKeyword {
  term: string
  frequency: number
  relevance: number
  difficulty: number
  competition: number
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'his',
  'hers', 'ours', 'theirs', 'what', 'which', 'who', 'whom', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'because', 'as', 'until', 'while', 'if', 'else',
  'then', 'also', 'get', 'got', 'make', 'made', 'like', 'one', 'two', 'new',
  'know', 'see', 'way', 'use', 'back', 'first', 'well', 'even', 'still',
])

const YOUTUBE_NICHE_CLUSTERS: Record<string, string[]> = {
  'tech': ['tech', 'technology', 'computer', 'software', 'hardware', 'programming', 'coding', 'app', 'ai', 'artificial intelligence', 'gadget', 'review', 'unboxing', 'smartphone', 'laptop', 'gaming'],
  'gaming': ['gaming', 'game', 'gameplay', 'walkthrough', 'lets play', 'minecraft', 'fortnite', 'roblox', 'valorant', 'cod', 'fifa', 'nintendo', 'playstation', 'xbox', 'esports'],
  'education': ['education', 'learning', 'course', 'tutorial', 'lesson', 'class', 'lecture', 'study', 'learn', 'teach', 'training', 'how to', 'guide', 'explain', 'science'],
  'entertainment': ['entertainment', 'funny', 'comedy', 'vlog', 'prank', 'challenge', 'reaction', 'memes', 'skit', 'comedy'],
  'music': ['music', 'song', 'album', 'cover', 'remix', 'instrumental', 'beat', 'lyric', 'concert', 'live', 'performance', 'band', 'artist'],
  'sports': ['sports', 'football', 'soccer', 'basketball', 'baseball', 'tennis', 'fitness', 'workout', 'training', 'exercise', 'gym', 'yoga'],
  'food': ['food', 'cooking', 'recipe', 'baking', 'kitchen', 'chef', 'tasty', 'delicious', 'meal', 'dinner', 'breakfast', 'vegan'],
  'travel': ['travel', 'traveling', 'trip', 'vacation', 'holiday', 'tour', 'adventure', 'explore', 'destination', 'backpacking', 'road trip'],
  'howto': ['how to', 'diy', 'craft', 'repair', 'fix', 'build', 'create', 'make', 'tips', 'hack', 'life hack', 'tutorial'],
  'news': ['news', 'breaking', 'update', 'report', 'analysis', 'politics', 'world', 'current', 'events', 'debate'],
}

export class KeywordExtractor {
  extract(video: YouTubeVideoData): KeywordResult {
    const combinedText = `${video.title} ${video.description} ${(video.tags ?? []).join(' ')}`.toLowerCase()

    // Extract n-grams (1, 2, and 3 word phrases)
    const unigrams = this.extractUnigrams(combinedText)
    const bigrams = this.extractBigrams(combinedText)
    const trigrams = this.extractTrigrams(combinedText)

    // Score candidates
    const allCandidates = new Map<string, { frequency: number; length: number }>()

    for (const [term, count] of unigrams) {
      allCandidates.set(term, { frequency: count, length: 1 })
    }
    for (const [term, count] of bigrams) {
      const existing = allCandidates.get(term)
      allCandidates.set(term, { frequency: count + (existing?.frequency ?? 0), length: 2 })
    }
    for (const [term, count] of trigrams) {
      const existing = allCandidates.get(term)
      allCandidates.set(term, { frequency: count + (existing?.frequency ?? 0), length: 3 })
    }

    // Score and rank
    const scored: ScoredKeyword[] = Array.from(allCandidates.entries())
      .filter(([term]) => term.length >= 3)
      .map(([term, { frequency, length }]) => {
        const titleBoost = video.title.toLowerCase().includes(term) ? 1.5 : 1.0
        const tagBoost = (video.tags ?? []).some(t => t.toLowerCase().includes(term)) ? 1.3 : 1.0
        const lengthBonus = length >= 2 ? 1.2 : 1.0
        const relevance = Math.min(Math.round(frequency * 10 * titleBoost * tagBoost * lengthBonus), 100)

        const difficulty = this.estimateDifficulty(term)
        const competition = this.estimateCompetition(term)

        return {
          term,
          frequency,
          relevance,
          difficulty,
          competition,
        }
      })
      .sort((a, b) => (b.relevance * (1 - b.difficulty / 100)) - (a.relevance * (1 - a.difficulty / 100)))
      .slice(0, 30)

    const clusterName = this.detectNiche(combinedText)
    const opportunityScore = this.computeOpportunity(scored)
    const searchVolumeEstimate = this.estimateSearchVolume(scored)
    const competitionEstimate = scored.length > 0
      ? Math.round(scored.reduce((s, k) => s + k.competition, 0) / scored.length * 100) / 100
      : 0.5
    const difficultyEstimate = scored.length > 0
      ? Math.round(scored.reduce((s, k) => s + k.difficulty, 0) / scored.length)
      : 50

    // Generate suggested tags (exclude existing tags)
    const existingTagsLower = (video.tags ?? []).map(t => t.toLowerCase())
    const suggestedTags = scored
      .filter(k => !existingTagsLower.includes(k.term) && k.term.includes(' '))
      .slice(0, 15)
      .map(k => k.term)

    return {
      extractedKeywords: scored.slice(0, 15),
      suggestedTags,
      clusterName,
      opportunityScore,
      searchVolumeEstimate,
      competitionEstimate,
      difficultyEstimate,
    }
  }

  private extractUnigrams(text: string): Map<string, number> {
    const words = text.split(/\W+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
    const freq = new Map<string, number>()
    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
    return freq
  }

  private extractBigrams(text: string): Map<string, number> {
    const words = text.split(/\W+/).filter(w => w.length > 0 && !STOP_WORDS.has(w))
    const freq = new Map<string, number>()
    for (let i = 0; i < words.length - 1; i++) {
      if (STOP_WORDS.has(words[i]!) || STOP_WORDS.has(words[i + 1]!)) continue
      const bigram = `${words[i]} ${words[i + 1]}`
      freq.set(bigram, (freq.get(bigram) ?? 0) + 1)
    }
    return freq
  }

  private extractTrigrams(text: string): Map<string, number> {
    const words = text.split(/\W+/).filter(w => w.length > 0 && !STOP_WORDS.has(w))
    const freq = new Map<string, number>()
    for (let i = 0; i < words.length - 2; i++) {
      if (STOP_WORDS.has(words[i]!) || STOP_WORDS.has(words[i + 1]!) || STOP_WORDS.has(words[i + 2]!)) continue
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
      freq.set(trigram, (freq.get(trigram) ?? 0) + 1)
    }
    return freq
  }

  private estimateDifficulty(term: string): number {
    // Heuristic: shorter/generic terms are harder
    const genericWords = ['video', 'how', 'what', 'why', 'best', 'top', 'new', '2024', '2025', '2026', 'guide', 'tips', 'review', 'tutorial']
    const isGeneric = genericWords.some(w => term.toLowerCase().split(' ').includes(w))
    if (isGeneric) return Math.min(70 + Math.floor(Math.random() * 20), 95)

    const termLength = term.length
    if (termLength > 40) return 20 + Math.floor(Math.random() * 15)  // long-tail
    if (termLength > 20) return 30 + Math.floor(Math.random() * 20)
    return 40 + Math.floor(Math.random() * 40)
  }

  private estimateCompetition(term: string): number {
    const competitiveNiches = ['tech', 'gaming', 'music', 'sports', 'cooking', 'beauty', 'fashion']
    const isCompetitive = competitiveNiches.some(n => term.toLowerCase().includes(n))
    if (isCompetitive) return 0.6 + Math.random() * 0.3
    return 0.2 + Math.random() * 0.4
  }

  private detectNiche(text: string): string | null {
    const textLower = text.toLowerCase()
    let bestNiche: string | null = null
    let bestScore = 0

    for (const [niche, keywords] of Object.entries(YOUTUBE_NICHE_CLUSTERS)) {
      const score = keywords.filter(kw => textLower.includes(kw)).length
      if (score > bestScore) { bestScore = score; bestNiche = niche }
    }

    return bestScore > 0 ? bestNiche! : null
  }

  private computeOpportunity(keywords: ScoredKeyword[]): number {
    if (keywords.length === 0) return 0
    const scores = keywords.map(k => k.relevance * (1 - k.difficulty / 100) * (1 - k.competition))
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length
    return Math.min(Math.max(Math.round(avg), 0), 100)
  }

  private estimateSearchVolume(keywords: ScoredKeyword[]): number {
    if (keywords.length === 0) return 0
    const topTerms = keywords.slice(0, 5)
    let total = 0
    for (const k of topTerms) {
      const baseVolume = 1000 + Math.floor(Math.random() * 50000)
      const difficultyPenalty = 1 - k.difficulty / 100
      total += Math.round(baseVolume * difficultyPenalty)
    }
    return Math.round(total / topTerms.length)
  }
}

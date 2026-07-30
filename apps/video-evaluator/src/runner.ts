import { YouTubeFetcher, type YouTubeVideoData, type YouTubeChannelData } from './modules/youtube-fetcher.js'
import { SEOAnalyzer } from './modules/seo-analyzer.js'
import { ThumbnailAnalyzer } from './modules/thumbnail-analyzer.js'
import { KeywordExtractor } from './modules/keyword-extractor.js'
import { AISuggester, type AISuggestions } from './modules/ai-suggester.js'

export interface VideoEvalResult {
  url: string
  inputType: 'video' | 'channel'
  video: YouTubeVideoData | null
  channel: YouTubeChannelData | null
  seo: ReturnType<SEOAnalyzer['analyze']>
  thumbnail: Awaited<ReturnType<ThumbnailAnalyzer['analyze']>>
  keywords: ReturnType<KeywordExtractor['extract']>
  ai?: AISuggestions
  overallScore: number
  timestamp: string
  duration: number
}

export class EvalRunner {
  private fetcher: YouTubeFetcher
  private seo: SEOAnalyzer
  private thumbnail: ThumbnailAnalyzer
  private keywords: KeywordExtractor
  private ai: AISuggester | null = null

  constructor(apiKey: string, aiProvider?: string) {
    this.fetcher = new YouTubeFetcher({ apiKey })
    this.seo = new SEOAnalyzer()
    this.thumbnail = new ThumbnailAnalyzer()
    this.keywords = new KeywordExtractor()
    if (aiProvider && aiProvider !== 'none') {
      this.ai = new AISuggester(aiProvider)
    }
  }

  async evaluate(input: string): Promise<VideoEvalResult> {
    const start = performance.now()
    const { type, data } = await this.fetcher.fetchByInput(input)

    let video: YouTubeVideoData | null = null
    let channel: YouTubeChannelData | null = null

    if (type === 'video') {
      video = data as YouTubeVideoData
    } else {
      channel = data as YouTubeChannelData
      video = channel.recentVideos[0] ?? null
    }

    if (!video) {
      throw new Error('No video data available to analyze.')
    }

    const [seoResult, thumbnailResult, keywordResult] = await Promise.all([
      Promise.resolve(this.seo.analyze(video)),
      this.thumbnail.analyze(video),
      Promise.resolve(this.keywords.extract(video)),
    ])

    let aiResult: AISuggestions | undefined
    if (this.ai && this.ai.isAvailable()) {
      aiResult = await this.ai.generateWithAI(video)
    } else if (this.ai) {
      aiResult = {
        titles: this.ai.generateTitleVariants(video),
        description: this.ai.generateDescription(video),
        tags: this.ai.generateTags(video),
        analysis: this.ai.generateAnalysis(video, seoResult, thumbnailResult, keywordResult),
      }
    }

    const overallScore = Math.round(
      seoResult.score * 0.30 +
      thumbnailResult.score * 0.20 +
      keywordResult.opportunityScore * 0.35 +
      (keywordResult.extractedKeywords.length > 0 ? 15 : 0)
    )

    const duration = Math.round(performance.now() - start)

    return {
      url: input,
      inputType: type as 'video' | 'channel',
      video,
      channel,
      seo: seoResult,
      thumbnail: thumbnailResult,
      keywords: keywordResult,
      ai: aiResult,
      overallScore,
      timestamp: new Date().toISOString(),
      duration,
    }
  }
}

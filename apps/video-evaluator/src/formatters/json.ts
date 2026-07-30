import type { VideoEvalResult } from '../runner.js'

export interface JSONReport {
  meta: {
    tool: string
    version: string
    timestamp: string
    durationMs: number
  }
  input: {
    url: string
    type: string
  }
  scores: {
    overall: number
    seo: number
    thumbnail: number
    keywordOpportunity: number
  }
  video: {
    title: string
    channelTitle: string
    channelId: string
    duration: string
    durationSeconds: number
    views: number
    likes: number
    comments: number
    tags: string[]
    publishedAt: string
    thumbnailUrl: string
  } | null
  seo: {
    score: number
    passing: number
    warnings: number
    failing: number
    details: Array<{ category: string; field: string; status: string; message: string }>
    suggestions: string[]
  }
  thumbnail: {
    score: number
    brightness: number
    contrast: number
    saturation: number
    faceDetected: boolean
    textDetected: boolean
    textRatio: number
    dominantColors: Array<{ hex: string; percentage: number; name: string }>
    suggestions: string[]
  }
  keywords: {
    opportunityScore: number
    clusterName: string | null
    searchVolumeEstimate: number
    difficultyEstimate: number
    competitionEstimate: number
    extracted: Array<{ term: string; frequency: number; relevance: number; difficulty: number }>
    suggestedTags: string[]
  }
  ai?: {
    titles: Array<{ title: string; reasoning: string }>
    tags: string[]
    description?: string
  }
}

export function formatJSON(result: VideoEvalResult): JSONReport {
  const seoPassing = result.seo.details.filter(d => d.status === 'pass').length
  const seoWarnings = result.seo.details.filter(d => d.status === 'warn').length
  const seoFailing = result.seo.details.filter(d => d.status === 'fail').length

  return {
    meta: {
      tool: 'CreatorOS Video Evaluator',
      version: '0.1.0',
      timestamp: result.timestamp,
      durationMs: result.duration,
    },
    input: {
      url: result.url,
      type: result.inputType,
    },
    scores: {
      overall: result.overallScore,
      seo: result.seo.score,
      thumbnail: result.thumbnail.score,
      keywordOpportunity: result.keywords.opportunityScore,
    },
    video: result.video ? {
      title: result.video.title,
      channelTitle: result.video.channelTitle,
      channelId: result.video.channelId,
      duration: result.video.duration,
      durationSeconds: result.video.durationSeconds,
      views: result.video.viewCount,
      likes: result.video.likeCount,
      comments: result.video.commentCount,
      tags: result.video.tags,
      publishedAt: result.video.publishedAt,
      thumbnailUrl: result.video.thumbnailHighUrl,
    } : null,
    seo: {
      score: result.seo.score,
      passing: seoPassing,
      warnings: seoWarnings,
      failing: seoFailing,
      details: result.seo.details.map(d => ({
        category: d.category,
        field: d.field,
        status: d.status,
        message: d.message,
      })),
      suggestions: result.seo.suggestions,
    },
    thumbnail: {
      score: result.thumbnail.score,
      brightness: Math.round(result.thumbnail.brightness),
      contrast: result.thumbnail.contrast,
      saturation: result.thumbnail.saturation,
      faceDetected: result.thumbnail.faceDetected,
      textDetected: result.thumbnail.textDetected,
      textRatio: Math.round(result.thumbnail.textRatio * 100) / 100,
      dominantColors: result.thumbnail.dominantColors,
      suggestions: result.thumbnail.suggestions,
    },
    keywords: {
      opportunityScore: result.keywords.opportunityScore,
      clusterName: result.keywords.clusterName,
      searchVolumeEstimate: result.keywords.searchVolumeEstimate,
      difficultyEstimate: result.keywords.difficultyEstimate,
      competitionEstimate: result.keywords.competitionEstimate,
      extracted: result.keywords.extractedKeywords.map(k => ({
        term: k.term,
        frequency: k.frequency,
        relevance: k.relevance,
        difficulty: k.difficulty,
      })),
      suggestedTags: result.keywords.suggestedTags,
    },
    ai: result.ai ? {
      titles: result.ai.titles,
      tags: result.ai.tags,
      description: result.ai.description,
    } : undefined,
  }
}

export type ChannelStatus = 'ACTIVE' | 'DISCONNECTED' | 'ERROR' | 'PENDING_REFRESH'
export type VideoStatus = 'PUBLIC' | 'PRIVATE' | 'UNLISTED' | 'SCHEDULED' | 'DELETED' | 'DRAFT'
export type AITaskType =
  | 'TITLE_GENERATION'
  | 'DESCRIPTION_OPTIMIZATION'
  | 'SCRIPT_WRITING'
  | 'THUMBNAIL_ANALYSIS'
  | 'KEYWORD_RESEARCH'
  | 'TAG_GENERATION'
  | 'COMPETITOR_ANALYSIS'
  | 'TREND_FORECASTING'
  | 'COMMENT_ANALYSIS'
  | 'ANALYTICS_EXPLANATION'
export type AITaskStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type AIProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'OLLAMA' | 'CUSTOM'

export interface OpportunityScore {
  score: number
  trend: 'up' | 'down' | 'stable'
  change: number
  factors: { label: string; impact: 'positive' | 'negative'; detail: string }[]
  suggestedActions: string[]
}

export interface KPICard {
  label: string
  value: number | string
  format?: 'number' | 'currency' | 'percentage' | 'duration'
  change?: number
  trend?: 'up' | 'down' | 'stable'
  sparklineData?: number[]
}

export interface AICompletionResult {
  content: string
  model: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  latencyMs: number
  cost: number
}

export interface ThumbnailAnalysis {
  score: number
  contrast: number
  brightness: number
  textDetected: boolean
  textAreas: { x: number; y: number; width: number; height: number }[]
  faces: { x: number; y: number; width: number; height: number; gazeDirection?: string }[]
  colorPalette: { hex: string; percentage: number }[]
  suggestions: string[]
}

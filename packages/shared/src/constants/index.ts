export const APP_NAME = 'CreatorOS'
export const API_VERSION = 'v1'
export const API_PREFIX = `/api/${API_VERSION}`

export const PERIODS = ['7d', '28d', '90d', '1y', 'custom'] as const
export const AI_TONES = ['educational', 'entertaining', 'controversial', 'informative'] as const
export const PRODUCTION_STAGES = ['idea', 'script', 'recording', 'editing', 'thumbnail', 'published'] as const
export const CALENDAR_STAGES = ['backlog', 'this-week', 'next-week', 'published'] as const

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
]

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  YOUTUBE_API_ERROR: 'YOUTUBE_API_ERROR',
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',
  PLUGIN_ERROR: 'PLUGIN_ERROR',
} as const

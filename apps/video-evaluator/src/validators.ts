import { z } from 'zod'

const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/
const channelIdRegex = /^UC[a-zA-Z0-9_-]{22}$/
const handleRegex = /^@[\w.-]+$/

export type ExtractedTarget =
  | { type: 'video'; videoId: string; url: string }
  | { type: 'channel'; channelId: string; url: string }
  | { type: 'handle'; handle: string; url: string }

export function extractYouTubeId(input: string): ExtractedTarget {
  const trimmed = input.trim()

  // Channel ID (UC...)
  if (channelIdRegex.test(trimmed)) {
    return { type: 'channel', channelId: trimmed, url: `https://youtube.com/channel/${trimmed}` }
  }

  // Handle (@handle)
  if (handleRegex.test(trimmed)) {
    return { type: 'handle', handle: trimmed.replace('@', ''), url: `https://youtube.com/${trimmed}` }
  }

  // Video ID (11 chars)
  if (videoIdRegex.test(trimmed)) {
    return { type: 'video', videoId: trimmed, url: `https://youtube.com/watch?v=${trimmed}` }
  }

  // Full URLs
  try {
    const url = new URL(trimmed)

    // youtube.com/watch?v=...
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      // Short URL: youtu.be/VIDEO_ID
      if (url.hostname === 'youtu.be') {
        const videoId = url.pathname.slice(1).split('/')[0]?.split('?')[0]
        if (videoId && videoIdRegex.test(videoId)) {
          return { type: 'video', videoId, url: trimmed }
        }
      }

      // youtube.com/watch?v=...
      const videoId = url.searchParams.get('v')
      if (videoId && videoIdRegex.test(videoId)) {
        return { type: 'video', videoId, url: trimmed }
      }

      // youtube.com/channel/UC...
      const channelMatch = url.pathname.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/)
      if (channelMatch) {
        return { type: 'channel', channelId: channelMatch[1]!, url: trimmed }
      }

      // youtube.com/@handle
      const handleMatch = url.pathname.match(/\/@([\w.-]+)/)
      if (handleMatch) {
        return { type: 'handle', handle: handleMatch[1]!, url: trimmed }
      }
    }
  } catch {}

  throw new Error(
    `Could not parse "${input}" as a YouTube URL or ID.\n` +
    `Expected formats:\n` +
    `  - https://youtube.com/watch?v=VIDEO_ID\n` +
    `  - https://youtu.be/VIDEO_ID\n` +
    `  - https://youtube.com/channel/UC...\n` +
    `  - https://youtube.com/@handle\n` +
    `  - VIDEO_ID (11 character string)\n` +
    `  - UC... (channel ID)\n` +
    `  - @handle`
  )
}

export const EvalOptionsSchema = z.object({
  target: z.string().min(1).describe('YouTube URL, video ID, channel ID, or @handle'),
  format: z.enum(['cli', 'json', 'html']).default('cli'),
  output: z.string().optional().describe('Output file path (for json/html formats)'),
  aiProvider: z.enum(['openai', 'anthropic', 'google', 'ollama', 'none']).default('none'),
  language: z.string().default('en'),
  verbose: z.boolean().default(false),
  batchFile: z.string().optional(),
})

export type EvalOptions = z.infer<typeof EvalOptionsSchema>

export function validateApiKey(provider: string): string | null {
  const envKeyMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_AI_API_KEY',
    ollama: 'OLLAMA_BASE_URL',
  }
  const envKey = envKeyMap[provider]
  if (!envKey) return null

  const value = process.env[envKey]
  if (!value || value.length === 0) {
    return `Missing ${envKey} environment variable for ${provider} provider`
  }
  return null
}

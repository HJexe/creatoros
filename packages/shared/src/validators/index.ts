import { z } from 'zod'

export const youtubeIdRegex = /^UC[a-zA-Z0-9_-]{22}$/
export const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  period: z.enum(['7d', '28d', '90d', '1y', 'custom']).optional().default('28d'),
})

export const seeker = {
  connectChannel: z.object({
    youtubeId: z.string().regex(youtubeIdRegex),
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
  }),
  generateTitles: z.object({
    videoDescription: z.string().min(10).max(10000),
    targetKeywords: z.array(z.string()).max(10).default([]),
    tone: z.enum(['educational', 'entertaining', 'controversial', 'informative']).default('informative'),
    count: z.number().int().min(1).max(20).default(10),
  }),
  analyzeThumbnail: z.object({
    imageUrl: z.string().url().optional(),
    imageBase64: z.string().optional(),
  }).refine(d => d.imageUrl || d.imageBase64, 'Provide imageUrl or imageBase64'),
  createWebhook: z.object({
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    channel: z.enum(['DISCORD', 'SLACK', 'WEBHOOK']),
    name: z.string().max(100).optional(),
  }),
}

export type ConnectChannelInput = z.infer<typeof seeker.connectChannel>
export type GenerateTitlesInput = z.infer<typeof seeker.generateTitles>

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { prisma } from '@creatoros/database'
import { z } from 'zod'

const server = new Server(
  { name: 'creatoros-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_analytics_overview',
      description: 'Get channel analytics overview for a given period',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'CreatorOS channel ID' },
          period: { type: 'string', enum: ['7d', '28d', '90d', '1y'] },
        },
        required: ['channelId'],
      },
    },
    {
      name: 'list_recent_videos',
      description: 'List recent videos with performance metrics',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          limit: { type: 'number', default: 10 },
        },
        required: ['channelId'],
      },
    },
    {
      name: 'search_keywords',
      description: 'Search tracked keywords with opportunity scores',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          query: { type: 'string' },
          minOpportunity: { type: 'number' },
        },
        required: ['channelId'],
      },
    },
    {
      name: 'generate_title',
      description: 'Generate video title variants using AI',
      inputSchema: {
        type: 'object',
        properties: {
          videoDescription: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          tone: { type: 'string', enum: ['educational', 'entertaining', 'informative'] },
        },
        required: ['videoDescription'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  switch (name) {
    case 'get_analytics_overview': {
      const { channelId, period = '28d' } = args as { channelId: string; period?: string }
      const days = parseInt(period)
      const since = new Date(Date.now() - days * 86400000)

      const videos = await prisma.video.findMany({
        where: { channelId, publishedAt: { gte: since } },
        include: { analytics: { take: 1, orderBy: { snapshotDate: 'desc' } } },
      })

      const totalViews = videos.reduce((s, v) => s + (v.analytics[0]?.views ?? 0), 0)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ videoCount: videos.length, totalViews, period }, null, 2),
        }],
      }
    }

    case 'list_recent_videos': {
      const { channelId, limit = 10 } = args as { channelId: string; limit?: number }
      const videos = await prisma.video.findMany({
        where: { channelId },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        include: { analytics: { take: 1, orderBy: { snapshotDate: 'desc' } } },
      })
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(videos.map(v => ({
            id: v.id,
            title: v.title,
            publishedAt: v.publishedAt,
            views: v.analytics[0]?.views ?? 0,
          })), null, 2),
        }],
      }
    }

    case 'search_keywords': {
      const { channelId, query, minOpportunity } = args as {
        channelId: string; query?: string; minOpportunity?: number
      }
      const keywords = await prisma.keyword.findMany({
        where: {
          channelId,
          ...(query ? { term: { contains: query, mode: 'insensitive' } } : {}),
          ...(minOpportunity ? { opportunityScore: { gte: minOpportunity } } : {}),
        },
        orderBy: { opportunityScore: 'desc' },
        take: 20,
      })
      return {
        content: [{ type: 'text', text: JSON.stringify(keywords, null, 2) }],
      }
    }

    case 'generate_title': {
      const { videoDescription, keywords = [], tone = 'informative' } = args as {
        videoDescription: string; keywords?: string[]; tone?: string
      }
      // This would call the AI provider package
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            note: 'Title generation requires AI provider. This is a stub.',
            input: { videoDescription, keywords, tone },
          }, null, 2),
        }],
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)

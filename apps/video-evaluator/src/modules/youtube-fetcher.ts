import { extractYouTubeId, type ExtractedTarget } from '../validators.js'

export interface YouTubeVideoData {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  thumbnailHighUrl: string
  channelId: string
  channelTitle: string
  publishedAt: string
  duration: string
  durationSeconds: number
  tags: string[]
  categoryId: string
  defaultLanguage: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  subscriberCount: number | null
}

export interface YouTubeChannelData {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  customUrl: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  country: string
  publishedAt: string
  recentVideos: YouTubeVideoData[]
}

export interface YouTubeFetcherConfig {
  apiKey: string
  timeout?: number
}

export class YouTubeFetcher {
  private baseUrl = 'https://www.googleapis.com/youtube/v3'
  private apiKey: string

  constructor(config: YouTubeFetcherConfig) {
    if (!config.apiKey) throw new Error('YouTube Data API key is required. Set YOUTUBE_API_KEY in your environment.')
    this.apiKey = config.apiKey
  }

  async fetchByInput(input: string): Promise<{ type: string; data: YouTubeVideoData | YouTubeChannelData }> {
    const target = extractYouTubeId(input)
    switch (target.type) {
      case 'video':
        return { type: 'video', data: await this.fetchVideo(target.videoId) }
      case 'channel':
        return { type: 'channel', data: await this.fetchChannel(target.channelId) }
      case 'handle':
        return { type: 'channel', data: await this.fetchChannelByHandle(target.handle) }
    }
  }

  async fetchVideo(videoId: string): Promise<YouTubeVideoData> {
    const [videoRes, channelSubs] = await Promise.all([
      this.get('/videos', {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
      }),
      this.getChannelSubCountFromVideo(videoId),
    ])

    const item = videoRes.items?.[0]
    if (!item) throw new Error(`Video "${videoId}" not found. Check the ID or URL.`)

    const snippet = item.snippet
    const stats = item.statistics ?? {}
    const duration = this.parseDuration(item.contentDetails?.duration ?? 'PT0S')

    return {
      id: item.id,
      title: snippet.title ?? '',
      description: snippet.description ?? '',
      thumbnailUrl: snippet.thumbnails?.default?.url ?? '',
      thumbnailHighUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? '',
      channelId: snippet.channelId ?? '',
      channelTitle: snippet.channelTitle ?? '',
      publishedAt: snippet.publishedAt ?? '',
      duration: duration.formatted,
      durationSeconds: duration.seconds,
      tags: snippet.tags ?? [],
      categoryId: snippet.categoryId ?? '',
      defaultLanguage: snippet.defaultLanguage ?? null,
      viewCount: parseInt(stats.viewCount ?? '0'),
      likeCount: parseInt(stats.likeCount ?? '0'),
      commentCount: parseInt(stats.commentCount ?? '0'),
      subscriberCount: channelSubs,
    }
  }

  async fetchChannel(channelId: string): Promise<YouTubeChannelData> {
    const res = await this.get('/channels', {
      part: 'snippet,statistics',
      id: channelId,
    })

    const item = res.items?.[0]
    if (!item) throw new Error(`Channel "${channelId}" not found.`)

    const snippet = item.snippet
    const stats = item.statistics ?? {}

    const recentVideos = await this.fetchChannelVideos(channelId, 10)

    return {
      id: item.id,
      title: snippet.title ?? '',
      description: snippet.description ?? '',
      thumbnailUrl: snippet.thumbnails?.default?.url ?? '',
      customUrl: snippet.customUrl ?? '',
      subscriberCount: parseInt(stats.subscriberCount ?? '0'),
      videoCount: parseInt(stats.videoCount ?? '0'),
      viewCount: parseInt(stats.viewCount ?? '0'),
      country: snippet.country ?? '',
      publishedAt: snippet.publishedAt ?? '',
      recentVideos,
    }
  }

  async fetchChannelByHandle(handle: string): Promise<YouTubeChannelData> {
    const searchRes = await this.get('/search', {
      part: 'snippet',
      q: `@${handle}`,
      type: 'channel',
      maxResults: 1,
    })

    const found = searchRes.items?.[0]
    if (!found) throw new Error(`Channel "@${handle}" not found.`)

    return this.fetchChannel(found.snippet.channelId)
  }

  async fetchChannelVideos(channelId: string, maxResults = 50): Promise<YouTubeVideoData[]> {
    const searchRes = await this.get('/search', {
      part: 'id',
      channelId,
      order: 'date',
      maxResults: Math.min(maxResults, 50),
      type: 'video',
    })

    const videoIds = (searchRes.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean)
    if (videoIds.length === 0) return []

    const videoRes = await this.get('/videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoIds.join(','),
    })

    return (videoRes.items ?? []).map((item: any) => {
      const snippet = item.snippet
      const stats = item.statistics ?? {}
      const duration = this.parseDuration(item.contentDetails?.duration ?? 'PT0S')
      return {
        id: item.id,
        title: snippet.title ?? '',
        description: snippet.description ?? '',
        thumbnailUrl: snippet.thumbnails?.default?.url ?? '',
        thumbnailHighUrl: snippet.thumbnails?.high?.url ?? '',
        channelId: snippet.channelId ?? '',
        channelTitle: snippet.channelTitle ?? '',
        publishedAt: snippet.publishedAt ?? '',
        duration: duration.formatted,
        durationSeconds: duration.seconds,
        tags: snippet.tags ?? [],
        categoryId: snippet.categoryId ?? '',
        defaultLanguage: snippet.defaultLanguage ?? null,
        viewCount: parseInt(stats.viewCount ?? '0'),
        likeCount: parseInt(stats.likeCount ?? '0'),
        commentCount: parseInt(stats.commentCount ?? '0'),
        subscriberCount: null,
      }
    })
  }

  async fetchComments(videoId: string, maxResults = 20): Promise<{ text: string; likes: number; publishedAt: string }[]> {
    try {
      const res = await this.get('/commentThreads', {
        part: 'snippet',
        videoId,
        maxResults: Math.min(maxResults, 100),
        order: 'relevance',
      })
      return (res.items ?? []).map((item: any) => ({
        text: item.snippet?.topLevelComment?.snippet?.textDisplay ?? '',
        likes: parseInt(item.snippet?.topLevelComment?.snippet?.likeCount ?? '0'),
        publishedAt: item.snippet?.topLevelComment?.snippet?.publishedAt ?? '',
      }))
    } catch {
      return []
    }
  }

  async fetchVideoSuggestions(query: string): Promise<string[]> {
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const text = await res.text()
      const match = text.match(/\[(.*?)\]/)
      if (match) {
        try {
          const parsed = JSON.parse(`[${match[0]}]`)
          return parsed[1]?.map((s: string[]) => s[0]) ?? []
        } catch {}
      }
      return []
    } catch {
      return []
    }
  }

  private async getChannelSubCountFromVideo(videoId: string): Promise<number | null> {
    try {
      const videoRes = await this.get('/videos', {
        part: 'snippet',
        id: videoId,
      })
      const channelId = videoRes.items?.[0]?.snippet?.channelId
      if (!channelId) return null
      const channelRes = await this.get('/channels', {
        part: 'statistics',
        id: channelId,
      })
      return parseInt(channelRes.items?.[0]?.statistics?.subscriberCount ?? '0') || null
    } catch {
      return null
    }
  }

  private async get(endpoint: string, params: Record<string, string | number>): Promise<any> {
    const searchParams = new URLSearchParams()
    searchParams.set('key', this.apiKey)
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value))
    }

    const url = `${this.baseUrl}/${endpoint}?${searchParams.toString()}`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`YouTube API error (${res.status}): ${body}`)
    }

    return res.json()
  }

  private parseDuration(isoDuration: string): { seconds: number; formatted: string } {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    const hours = parseInt(match?.[1] ?? '0')
    const minutes = parseInt(match?.[2] ?? '0')
    const seconds = parseInt(match?.[3] ?? '0')
    const totalSeconds = hours * 3600 + minutes * 60 + seconds

    let formatted: string
    if (hours > 0) formatted = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    else formatted = `${minutes}:${String(seconds).padStart(2, '0')}`

    return { seconds: totalSeconds, formatted }
  }
}

import { z } from 'zod'

export interface AIProviderConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  maxRetries?: number
}

export interface AICompletionParams {
  model: string
  systemPrompt?: string
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json_object'
}

export interface AICompletionResult {
  content: string
  model: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  latencyMs: number
}

export interface AIEmbeddingParams {
  model: string
  input: string | string[]
}

export interface AIEmbeddingResult {
  embeddings: number[][]
  model: string
  usage: { totalTokens: number }
}

export interface AIProvider {
  name: string
  complete(params: AICompletionParams): Promise<AICompletionResult>
  embed?(params: AIEmbeddingParams): Promise<AIEmbeddingResult>
  isAvailable(): boolean
}

export const ProviderTaskScore = z.object({
  provider: z.string(),
  model: z.string(),
  score: z.number().min(0).max(100),
  estimatedCost: z.number(),
  estimatedLatencyMs: z.number(),
  reason: z.string(),
})

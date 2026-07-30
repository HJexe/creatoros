import OpenAI from 'openai'
import type { AIProvider, AIProviderConfig, AICompletionParams, AICompletionResult } from './base.js'

export class OpenAIProvider implements AIProvider {
  name = 'openai'
  private client: OpenAI
  private available = false

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) return
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
    this.available = true
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const start = Date.now()
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: [
        ...(params.systemPrompt ? [{ role: 'system' as const, content: params.systemPrompt }] : []),
        ...params.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048,
      response_format: params.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
    })
    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      latencyMs: Date.now() - start,
    }
  }

  isAvailable(): boolean { return this.available }
}

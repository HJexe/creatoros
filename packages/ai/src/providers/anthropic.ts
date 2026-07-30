import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIProviderConfig, AICompletionParams, AICompletionResult } from './base.js'

export class AnthropicProvider implements AIProvider {
  name = 'anthropic'
  private client: Anthropic | null = null
  private available = false

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) return
    this.client = new Anthropic({ apiKey: config.apiKey })
    this.available = true
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const start = Date.now()
    if (!this.client) throw new Error('Anthropic not configured')
    const msg = await this.client.messages.create({
      model: params.model,
      system: params.systemPrompt,
      messages: params.messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
    })
    return {
      content: msg.content.map(b => 'text' in b ? b.text : '').join('\n'),
      model: msg.model,
      usage: {
        promptTokens: msg.usage?.input_tokens ?? 0,
        completionTokens: msg.usage?.output_tokens ?? 0,
        totalTokens: (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0),
      },
      latencyMs: Date.now() - start,
    }
  }

  isAvailable(): boolean { return this.available }
}

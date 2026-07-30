import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, AIProviderConfig, AICompletionParams, AICompletionResult } from './base.js'

export class GoogleProvider implements AIProvider {
  name = 'google'
  private client: GoogleGenerativeAI | null = null
  private available = false

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) return
    this.client = new GoogleGenerativeAI(config.apiKey)
    this.available = true
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const start = Date.now()
    if (!this.client) throw new Error('Google AI not configured')
    const model = this.client.getGenerativeModel({ model: params.model })
    const chat = model.startChat({
      systemInstruction: params.systemPrompt ? { role: 'user', parts: [{ text: params.systemPrompt }] } : undefined,
    })
    const lastMessage = params.messages[params.messages.length - 1]
    const result = await chat.sendMessage(lastMessage?.content ?? '')
    const response = result.response
    return {
      content: response.text(),
      model: params.model,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      latencyMs: Date.now() - start,
    }
  }

  isAvailable(): boolean { return this.available }
}

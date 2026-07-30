import type { AIProvider, AIProviderConfig, AICompletionParams, AICompletionResult } from './base.js'

export class OllamaProvider implements AIProvider {
  name = 'ollama'
  private baseUrl: string
  private available = false

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434'
    this.available = true
  }

  async complete(params: AICompletionParams): Promise<AICompletionResult> {
    const start = Date.now()
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: [
          ...(params.systemPrompt ? [{ role: 'system', content: params.systemPrompt }] : []),
          ...params.messages,
        ],
        stream: false,
        options: { temperature: params.temperature ?? 0.7, num_predict: params.maxTokens ?? 2048 },
      }),
    })
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
    const data = await response.json() as { message: { content: string }; eval_count: number }
    return {
      content: data.message?.content ?? '',
      model: params.model,
      usage: { promptTokens: 0, completionTokens: data.eval_count ?? 0, totalTokens: data.eval_count ?? 0 },
      latencyMs: Date.now() - start,
    }
  }

  isAvailable(): boolean {
    return this.available
  }
}

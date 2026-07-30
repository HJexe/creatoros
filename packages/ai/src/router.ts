import type { AIProvider, AICompletionParams, AICompletionResult } from './providers/base.js'

type TaskCategory = 'chat' | 'vision' | 'embedding' | 'code' | 'analysis'

interface RouterRule {
  category: TaskCategory
  priority: string[] // Ordered list of provider:model
  maxCost: number
  minCapabilities: string[]
}

const ROUTER_RULES: Record<TaskCategory, RouterRule> = {
  chat: {
    category: 'chat',
    priority: ['google:gemini-2.5-flash', 'openai:gpt-4o-mini', 'anthropic:claude-3.5-sonnet', 'ollama:llama3'],
    maxCost: 0.01,
    minCapabilities: [],
  },
  vision: {
    category: 'vision',
    priority: ['openai:gpt-4o', 'anthropic:claude-4-opus', 'google:gemini-2.5-pro'],
    maxCost: 0.05,
    minCapabilities: ['vision'],
  },
  embedding: {
    category: 'embedding',
    priority: ['openai:text-embedding-3-small', 'google:text-embedding-004', 'ollama:nomic-embed-text'],
    maxCost: 0.001,
    minCapabilities: ['embedding'],
  },
  code: {
    category: 'code',
    priority: ['anthropic:claude-4-opus', 'openai:gpt-4o', 'google:gemini-2.5-pro'],
    maxCost: 0.03,
    minCapabilities: ['code'],
  },
  analysis: {
    category: 'analysis',
    priority: ['anthropic:claude-3.5-sonnet', 'openai:gpt-4o-mini', 'google:gemini-2.5-flash', 'ollama:mistral'],
    maxCost: 0.01,
    minCapabilities: [],
  },
}

export class AIRouter {
  private providers: Map<string, AIProvider> = new Map()

  registerProvider(name: string, provider: AIProvider): void {
    this.providers.set(name, provider)
  }

  async complete(category: TaskCategory, params: Omit<AICompletionParams, 'model'>): Promise<AICompletionResult> {
    const rule = ROUTER_RULES[category]
    const errors: string[] = []

    for (const providerModel of rule.priority) {
      const [providerName, model] = providerModel.split(':') as [string, string]
      const provider = this.providers.get(providerName)
      if (!provider || !provider.isAvailable()) {
        errors.push(`${providerName}: unavailable`)
        continue
      }
      try {
        return await provider.complete({ ...params, model })
      } catch (err) {
        errors.push(`${providerModel}: ${(err as Error).message}`)
        continue
      }
    }

    throw new Error(`All AI providers failed. Errors: ${errors.join('; ')}`)
  }

  getAvailableProviders(): { name: string; available: boolean }[] {
    return Array.from(this.providers.entries()).map(([name, p]) => ({
      name,
      available: p.isAvailable(),
    }))
  }
}

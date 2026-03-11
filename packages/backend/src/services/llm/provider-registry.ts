/**
 * Provider Registry - Single source of truth for LLM provider metadata
 * Reference: nanobot/providers/registry.py
 */

import type { ProviderSpec } from './types'

/**
 * Provider specifications
 * Order = priority for matching. Gateways first, then standard providers.
 */
export const PROVIDER_SPECS: ProviderSpec[] = [
  // === Gateways (detected by api_key / api_base) ===
  {
    name: 'openrouter',
    keywords: ['openrouter'],
    envKey: 'OPENROUTER_API_KEY',
    displayName: 'OpenRouter',
    litellmPrefix: 'openrouter',
    defaultApiBase: 'https://openrouter.ai/api/v1',
    isGateway: true,
    isLocal: false,
    supportsPromptCaching: true
  },

  // === Standard providers (matched by model-name keywords) ===
  {
    name: 'anthropic',
    keywords: ['anthropic', 'claude'],
    envKey: 'ANTHROPIC_API_KEY',
    displayName: 'Anthropic',
    litellmPrefix: '',
    defaultApiBase: '',
    isGateway: false,
    isLocal: false,
    supportsPromptCaching: true
  },
  {
    name: 'openai',
    keywords: ['openai', 'gpt', 'o1', 'o3', 'o4'],
    envKey: 'OPENAI_API_KEY',
    displayName: 'OpenAI',
    litellmPrefix: '',
    defaultApiBase: '',
    isGateway: false,
    isLocal: false,
    supportsPromptCaching: false
  },
  {
    name: 'deepseek',
    keywords: ['deepseek'],
    envKey: 'DEEPSEEK_API_KEY',
    displayName: 'DeepSeek',
    litellmPrefix: 'deepseek',
    defaultApiBase: 'https://api.deepseek.com/v1',
    isGateway: false,
    isLocal: false,
    supportsPromptCaching: false
  },
  {
    name: 'gemini',
    keywords: ['gemini'],
    envKey: 'GEMINI_API_KEY',
    displayName: 'Gemini',
    litellmPrefix: 'gemini',
    defaultApiBase: '',
    isGateway: false,
    isLocal: false,
    supportsPromptCaching: false
  },

  // === Local deployment ===
  {
    name: 'ollama',
    keywords: ['llama', 'mistral', 'qwen', 'gemma', 'phi', 'codellama'],
    envKey: 'OLLAMA_API_BASE',
    displayName: 'Ollama',
    litellmPrefix: 'ollama',
    defaultApiBase: 'http://localhost:11434/v1',
    isGateway: false,
    isLocal: true,
    supportsPromptCaching: false
  }
]

/**
 * Registry for LLM providers
 * Allows detection and lookup of provider specifications
 */
export class ProviderRegistry {
  private specs: Map<string, ProviderSpec>

  constructor() {
    this.specs = new Map(PROVIDER_SPECS.map(s => [s.name, s]))
  }

  /**
   * Get a provider spec by name
   */
  get(name: string): ProviderSpec | undefined {
    return this.specs.get(name)
  }

  /**
   * Detect provider by model name
   * Checks model keywords for matching
   */
  detectByModel(model: string): ProviderSpec | undefined {
    const modelLower = model.toLowerCase()

    // Check for explicit prefix like "openrouter/"
    const prefix = modelLower.split('/')[0]

    // First, try to match by explicit prefix
    for (const spec of PROVIDER_SPECS) {
      if (prefix === spec.name) {
        return spec
      }
    }

    // Then, match by keywords in model name
    for (const spec of PROVIDER_SPECS) {
      if (spec.keywords.some(kw => modelLower.includes(kw))) {
        return spec
      }
    }

    return undefined
  }

  /**
   * Detect provider by API key prefix
   * E.g., "sk-or-" indicates OpenRouter
   */
  detectByApiKeyPrefix(apiKey: string): ProviderSpec | undefined {
    // OpenRouter uses sk-or- prefix
    if (apiKey.startsWith('sk-or-')) {
      return this.get('openrouter')
    }

    return undefined
  }

  /**
   * Detect provider by API base URL
   */
  detectByApiBase(apiBase: string): ProviderSpec | undefined {
    const baseLower = apiBase.toLowerCase()

    // Check for known base URLs
    if (baseLower.includes('openrouter')) {
      return this.get('openrouter')
    }

    if (baseLower.includes('deepseek')) {
      return this.get('deepseek')
    }

    if (baseLower.includes('localhost:11434') || baseLower.includes('127.0.0.1:11434')) {
      return this.get('ollama')
    }

    return undefined
  }

  /**
   * Get all provider specs
   */
  getAll(): ProviderSpec[] {
    return [...PROVIDER_SPECS]
  }
}
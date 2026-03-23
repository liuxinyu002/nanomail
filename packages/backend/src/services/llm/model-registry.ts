/**
 * Model Registry - Model specifications with context window information
 * Used for token-based truncation decisions
 */

import type { ModelSpec } from './types'

/**
 * Known model specifications with context window sizes
 * Data sourced from official provider documentation
 */
export const MODEL_SPECS: ModelSpec[] = [
  // === OpenAI Models ===
  { id: 'gpt-4o', contextWindow: 128000, provider: 'openai' },
  { id: 'gpt-4o-mini', contextWindow: 128000, provider: 'openai' },
  { id: 'gpt-4-turbo', contextWindow: 128000, provider: 'openai' },
  { id: 'gpt-4', contextWindow: 8192, provider: 'openai' },
  { id: 'gpt-4-32k', contextWindow: 32768, provider: 'openai' },
  { id: 'gpt-3.5-turbo', contextWindow: 16385, provider: 'openai' },
  { id: 'gpt-3.5-turbo-16k', contextWindow: 16385, provider: 'openai' },
  { id: 'o1', contextWindow: 200000, provider: 'openai' },
  { id: 'o1-preview', contextWindow: 128000, provider: 'openai' },
  { id: 'o1-mini', contextWindow: 128000, provider: 'openai' },
  { id: 'o3-mini', contextWindow: 200000, provider: 'openai' },

  // === Anthropic Models ===
  { id: 'claude-3-5-sonnet', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-5-sonnet-20241022', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-5-sonnet-20240620', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-5-haiku', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-opus', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-opus-20240229', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-sonnet', contextWindow: 200000, provider: 'anthropic' },
  { id: 'claude-3-haiku', contextWindow: 200000, provider: 'anthropic' },

  // === DeepSeek Models ===
  { id: 'deepseek-chat', contextWindow: 64000, provider: 'deepseek' },
  { id: 'deepseek-reasoner', contextWindow: 64000, provider: 'deepseek' },
  { id: 'deepseek-r1', contextWindow: 64000, provider: 'deepseek' },

  // === Google Gemini Models ===
  { id: 'gemini-1.5-pro', contextWindow: 1048576, provider: 'gemini' },
  { id: 'gemini-1.5-flash', contextWindow: 1048576, provider: 'gemini' },
  { id: 'gemini-2.0-flash', contextWindow: 1048576, provider: 'gemini' },
  { id: 'gemini-pro', contextWindow: 32760, provider: 'gemini' },

  // === Local Models (Ollama defaults) ===
  { id: 'llama3.1', contextWindow: 128000, provider: 'ollama' },
  { id: 'llama3.2', contextWindow: 128000, provider: 'ollama' },
  { id: 'mistral', contextWindow: 32768, provider: 'ollama' },
  { id: 'qwen2.5', contextWindow: 32768, provider: 'ollama' }
]

/**
 * Default context window for unknown models
 * Conservative estimate to prevent API errors
 */
export const DEFAULT_CONTEXT_WINDOW = 32768

/**
 * Minimum tokens to reserve for model output
 * Prevents context window exhaustion
 */
export const MIN_OUTPUT_RESERVE_TOKENS = 4096

/**
 * Registry for model specifications
 * Provides context window information for token-based truncation
 */
export class ModelRegistry {
  private specs: Map<string, ModelSpec>

  constructor() {
    this.specs = new Map(MODEL_SPECS.map(s => [s.id, s]))
  }

  /**
   * Get model specification by exact ID
   */
  get(modelId: string): ModelSpec | undefined {
    return this.specs.get(modelId)
  }

  /**
   * Get context window for a model
   * Falls back to DEFAULT_CONTEXT_WINDOW if model not found
   *
   * @param modelId - Model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet')
   * @param providerName - Optional provider name for better matching
   * @returns Context window size in tokens
   */
  getContextWindow(modelId: string, providerName?: string): number {
    // Try exact match first
    const exactMatch = this.specs.get(modelId)
    if (exactMatch) {
      return exactMatch.contextWindow
    }

    // Try partial match (e.g., 'gpt-4o-2024-08-06' matches 'gpt-4o')
    const normalizedId = modelId.toLowerCase()
    for (const [id, spec] of this.specs) {
      if (normalizedId.startsWith(id.toLowerCase()) ||
          id.toLowerCase().includes(normalizedId.split('-').slice(0, 2).join('-'))) {
        return spec.contextWindow
      }
    }

    // Provider-specific defaults
    if (providerName) {
      const providerDefaults: Record<string, number> = {
        anthropic: 200000,
        openai: 128000,
        deepseek: 64000,
        gemini: 1048576,
        ollama: 8192
      }
      const providerDefault = providerDefaults[providerName.toLowerCase()]
      if (providerDefault) {
        return providerDefault
      }
    }

    // Final fallback
    return DEFAULT_CONTEXT_WINDOW
  }

  /**
   * Check if a model ID is known
   */
  isKnownModel(modelId: string): boolean {
    return this.specs.has(modelId) ||
           MODEL_SPECS.some(s => modelId.toLowerCase().startsWith(s.id.toLowerCase()))
  }

  /**
   * Get all known model IDs
   */
  getAllModelIds(): string[] {
    return [...this.specs.keys()]
  }
}

// Singleton instance for convenience
export const modelRegistry = new ModelRegistry()
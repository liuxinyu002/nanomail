/**
 * Base LLM Provider Interface
 * Reference: nanobot/providers/base.py
 */

import type { LLMResponse, ChatMessage, ChatParams, LLMProviderConfig } from './types'

/**
 * Abstract LLM Provider
 * Reference: nanobot/providers/base.py - LLMProvider
 */
export abstract class LLMProvider {
  protected apiKey: string | null
  protected apiBase: string | null

  constructor(config: LLMProviderConfig = {}) {
    this.apiKey = config.apiKey ?? null
    this.apiBase = config.apiBase ?? null
  }

  /**
   * Core chat method with tool support
   * Reference: nanobot/providers/base.py - chat() abstract method
   */
  abstract chat(params: ChatParams): Promise<LLMResponse>

  /**
   * Get the default model for this provider
   */
  abstract getDefaultModel(): string

  /**
   * Replace empty text content that causes provider 400 errors
   * Reference: nanobot/providers/base.py - _sanitize_empty_content()
   */
  static sanitizeEmptyContent(
    messages: ChatMessage[]
  ): ChatMessage[] {
    const result: ChatMessage[] = []

    for (const msg of messages) {
      const content = msg.content

      // Empty string content
      if (typeof content === 'string' && !content) {
        result.push({
          ...msg,
          content: '(empty)'
        })
        continue
      }

      result.push(msg)
    }

    return result
  }

  /**
   * Sanitize request messages - keep only provider-safe keys
   */
  static sanitizeRequestMessages(
    messages: ChatMessage[],
    allowedKeys: Set<string>
  ): ChatMessage[] {
    const sanitized: ChatMessage[] = []

    for (const msg of messages) {
      const clean: Record<string, unknown> = {}

      for (const key of Object.keys(msg)) {
        if (allowedKeys.has(key)) {
          clean[key] = msg[key as keyof ChatMessage]
        }
      }

      // Ensure assistant messages have content key
      if (clean.role === 'assistant' && !('content' in clean)) {
        clean.content = null
      }

      sanitized.push(clean as unknown as ChatMessage)
    }

    return sanitized
  }
}
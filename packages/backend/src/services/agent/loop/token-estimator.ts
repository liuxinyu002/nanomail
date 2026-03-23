/**
 * Token Estimator - Character-based token approximation
 *
 * Uses a simple heuristic: ~4 characters per token for most tokenizers.
 * This is a conservative estimate that works well for truncation purposes.
 * Not as accurate as tiktoken, but fast and dependency-free.
 */

import type { ToolCallRequest } from '../../llm/types'

/**
 * Message structure for token estimation
 */
export interface TokenEstimableMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  toolCalls?: ToolCallRequest[]
  toolCallId?: string
}

/**
 * Characters per token estimation
 * GPT/Claude tokenizers average ~4 chars per token
 */
const DEFAULT_CHARS_PER_TOKEN = 4

/**
 * Overhead tokens for message structure (role, metadata)
 */
const MESSAGE_OVERHEAD_TOKENS = 10

/**
 * Overhead tokens per tool call (id, structure)
 */
const TOOL_CALL_OVERHEAD_TOKENS = 10

/**
 * TokenEstimator - Estimates token counts for messages
 */
export class TokenEstimator {
  private readonly charsPerToken: number

  constructor(charsPerToken: number = DEFAULT_CHARS_PER_TOKEN) {
    this.charsPerToken = charsPerToken
  }

  /**
   * Estimate tokens for a single message
   *
   * @param msg - Message to estimate
   * @returns Estimated token count
   */
  estimateMessageTokens(msg: TokenEstimableMessage): number {
    let count = 0

    // Count content tokens
    if (msg.content) {
      count += this.estimateTextTokens(msg.content)
    }

    // Count tool calls tokens
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        count += this.estimateTextTokens(tc.name)
        count += this.estimateTextTokens(JSON.stringify(tc.arguments))
        count += TOOL_CALL_OVERHEAD_TOKENS
      }
    }

    // Count tool call id
    if (msg.toolCallId) {
      count += this.estimateTextTokens(msg.toolCallId)
    }

    // Add role/metadata overhead
    return count + MESSAGE_OVERHEAD_TOKENS
  }

  /**
   * Estimate total tokens for an array of messages
   *
   * @param messages - Messages to estimate
   * @returns Total estimated token count
   */
  estimateTotalTokens(messages: TokenEstimableMessage[]): number {
    return messages.reduce((sum, msg) => sum + this.estimateMessageTokens(msg), 0)
  }

  /**
   * Estimate tokens for a text string
   *
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTextTokens(text: string): number {
    return Math.ceil(text.length / this.charsPerToken)
  }

  /**
   * Truncate text to fit within a maximum character count
   * Adds truncation indicator if truncated
   *
   * @param text - Text to truncate
   * @param maxChars - Maximum characters allowed
   * @param indicator - Truncation indicator string
   * @returns Truncated text with indicator if truncated
   */
  truncateText(text: string, maxChars: number, indicator: string = '\n... (truncated)'): string {
    if (text.length <= maxChars) {
      return text
    }
    return text.substring(0, maxChars - indicator.length) + indicator
  }

  /**
   * Estimate tokens for a tool output object
   * Serializes to JSON and counts characters
   *
   * @param output - Tool output object
   * @returns Estimated token count
   */
  estimateToolOutputTokens(output: Record<string, unknown>): number {
    const serialized = JSON.stringify(output)
    return this.estimateTextTokens(serialized)
  }
}

// Singleton instance for convenience
export const tokenEstimator = new TokenEstimator()
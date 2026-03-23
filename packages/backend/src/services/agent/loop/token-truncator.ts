/**
 * Message Token Truncator
 * Truncates ChatMessage[] arrays while preserving tool_call/tool_output pairing
 *
 * CRITICAL: In multi-turn Function Calling scenarios, truncating history may split
 * tool_call requests from their corresponding tool_output results. This breaks
 * LLM API validation (400 Bad Request).
 *
 * This module ensures tool_call and tool_result are always removed together.
 *
 * Features:
 * - Tool output pre-truncation to prevent large outputs from consuming context
 * - Segment-based truncation: System Prompt + Evictable + Protected
 * - Recent conversation protection (last N turns)
 * - Atomic removal of assistant+tool message blocks
 * - Fallback for extreme overflow scenarios
 */

import { createLogger } from '../../../config/logger'
import type { ChatMessage } from '@nanomail/shared'

const log = createLogger('MessageTokenTruncator')

/**
 * Tool call structure from ChatMessage
 */
interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * Message segments for truncation
 * Divides messages into three regions with different eviction rules
 */
interface MessageSegments {
  /** System prompt (always preserved) */
  system: ChatMessage[]
  /** Historical messages that can be evicted */
  evictable: ChatMessage[]
  /** Recent messages protected from eviction */
  protected: ChatMessage[]
}

/**
 * Truncation options for MessageTokenTruncator
 * Subset of TruncationConfig - only the fields needed by this class
 */
export interface TruncationOptions {
  /** Maximum characters for tool output content */
  maxToolOutputChars: number
  /** Number of recent turns to protect */
  protectedRecentTurns: number
  /** Hard limit on total messages (matches TruncationConfig.maxMessagesLimit) */
  maxMessagesLimit: number
}

/**
 * Default truncation options
 */
export const DEFAULT_TRUNCATION_OPTIONS: TruncationOptions = {
  maxToolOutputChars: 3000,    // ~750 tokens
  protectedRecentTurns: 3,      // Protect last 3 turns
  maxMessagesLimit: 100         // Hard limit on messages
}

/**
 * MessageTokenTruncator - Truncates message arrays while preserving tool pairing
 *
 * Rules:
 * 1. When removing an assistant message with tool_calls, also remove corresponding tool role messages
 * 2. Never allow tool role messages to appear without their corresponding assistant tool_calls
 * 3. Protect recent conversation turns from truncation
 * 4. System prompt is always preserved
 */
export class MessageTokenTruncator {
  private options: TruncationOptions

  constructor(options?: Partial<TruncationOptions>) {
    this.options = { ...DEFAULT_TRUNCATION_OPTIONS, ...options }
  }

  /**
   * Truncate tool output content to prevent context overflow
   * Directly truncates JSON stringified output
   *
   * @param toolOutput - Tool output object
   * @param maxChars - Maximum characters allowed (default from options)
   * @returns Truncated JSON string
   */
  truncateToolOutputContent(
    toolOutput: Record<string, unknown>,
    maxChars?: number
  ): string {
    const limit = maxChars ?? this.options.maxToolOutputChars
    const contentStr = JSON.stringify(toolOutput)

    if (contentStr.length <= limit) {
      return contentStr
    }

    const indicator = '\n... (truncated)'
    return contentStr.substring(0, limit - indicator.length) + indicator
  }

  /**
   * Truncates message array to fit within token and message count limits
   * Preserves tool_call/tool_output pairing and recent conversations
   *
   * @param messages - Array of chat messages
   * @param maxTokens - Maximum allowed tokens
   * @param maxMessages - Maximum allowed messages (optional, uses options default)
   * @param tokenCounter - Function to count tokens in a message
   * @returns Truncated message array
   */
  truncate(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (msg: ChatMessage) => number,
    maxMessages?: number
  ): ChatMessage[] {
    if (messages.length === 0) return messages

    const msgLimit = maxMessages ?? this.options.maxMessagesLimit

    // Step 1: Segment messages into system/evictable/protected
    const segments = this.segmentMessages(messages)

    // Step 2: Check if truncation is needed
    const currentTokens = this.countTokensInSegments(segments, tokenCounter)
    const currentMessages = segments.evictable.length + segments.protected.length

    const needTruncate = currentTokens > maxTokens || currentMessages > msgLimit

    if (!needTruncate) {
      return [...segments.system, ...segments.evictable, ...segments.protected]
    }

    log.info(
      {
        originalTokens: currentTokens,
        maxTokens,
        originalMessages: currentMessages,
        maxMessages: msgLimit
      },
      '[Truncation] Starting truncation'
    )

    // Step 3: Evict from evictable region only
    const protectedTokens = this.countTokens(segments.protected, tokenCounter)
    const systemTokens = this.countTokens(segments.system, tokenCounter)

    const availableTokensForEvictable = maxTokens - protectedTokens - systemTokens
    const availableMessagesForEvictable = msgLimit - segments.protected.length

    segments.evictable = this.evictFromHead(
      segments.evictable,
      availableTokensForEvictable,
      availableMessagesForEvictable,
      tokenCounter
    )

    // Step 4: Reassemble
    const result = [...segments.system, ...segments.evictable, ...segments.protected]

    // Step 5: Validate
    const isValid = this.validateMessagePairs(result)
    if (!isValid || result.length === 0) {
      log.error(
        { originalLength: messages.length, truncatedLength: result.length, isValid },
        '[Truncation] Validation failed, applying fallback'
      )
      return this.applyFallback(messages, tokenCounter)
    }

    log.info(
      { truncatedTokens: this.countTokens(result, tokenCounter), truncatedMessages: result.length },
      '[Truncation] Completed'
    )

    return result
  }

  /**
   * Truncation with fallback for extreme overflow
   * If protected region is too large, breaks protection
   *
   * @param messages - Array of chat messages
   * @param maxTokens - Maximum allowed tokens
   * @param tokenCounter - Function to count tokens
   * @returns Truncated message array
   */
  truncateWithFallback(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (msg: ChatMessage) => number
  ): ChatMessage[] {
    // Try normal truncation first
    let result = this.truncate(messages, maxTokens, tokenCounter)
    let totalTokens = result.reduce((s, m) => s + tokenCounter(m), 0)

    if (totalTokens <= maxTokens) {
      return result
    }

    log.warn(
      { totalTokens, maxTokens },
      '[Truncation] Still over limit after normal truncation, breaking protection'
    )

    // Fallback: Keep only system prompt + last user message
    const systemMsg = result.find(m => m.role === 'system')
    const lastUserMsg = [...result].reverse().find(m => m.role === 'user')

    const minimal: ChatMessage[] = []
    if (systemMsg) minimal.push(systemMsg)
    if (lastUserMsg) minimal.push(lastUserMsg)

    // If still over limit, truncate user message content
    totalTokens = minimal.reduce((s, m) => s + tokenCounter(m), 0)
    if (totalTokens > maxTokens && lastUserMsg && typeof lastUserMsg.content === 'string') {
      const systemTokens = systemMsg ? tokenCounter(systemMsg) : 0
      const maxUserChars = (maxTokens - systemTokens) * 4
      lastUserMsg.content = lastUserMsg.content.substring(0, maxUserChars) + '\n... (truncated)'
    }

    return minimal
  }

  /**
   * Segment messages into system/evictable/protected regions
   */
  private segmentMessages(messages: ChatMessage[]): MessageSegments {
    // Step 1: Extract System Prompt (always first, if present)
    const system = messages[0]?.role === 'system' ? [messages[0]] : []

    // Step 2: Calculate protected region boundary
    const nonSystem = messages.slice(system.length)
    const protectedIndex = this.findProtectedIndex(nonSystem)

    // Step 3: Split into evictable and protected
    const protected_ = nonSystem.slice(protectedIndex)
    const evictable = nonSystem.slice(0, protectedIndex)

    return { system, evictable, protected: protected_ }
  }

  /**
   * Find the starting index of the protected region
   * Counts backwards from the end to find N complete turns
   *
   * A "turn" is a user message + its assistant response (and any tool calls)
   */
  private findProtectedIndex(messages: ChatMessage[]): number {
    const protectedTurns = this.options.protectedRecentTurns

    if (messages.length === 0 || protectedTurns <= 0) {
      return messages.length
    }

    let turnCount = 0
    let i = messages.length - 1

    // Walk backwards counting turns
    while (i >= 0 && turnCount < protectedTurns) {
      const msg = messages[i]

      // Count user messages as turn starts
      if (msg?.role === 'user') {
        turnCount++
      }

      i--
    }

    // Return the index where protected region starts
    return i + 1
  }

  /**
   * Evict messages from the head of the evictable region
   * Maintains atomicity for assistant+tool message blocks
   */
  private evictFromHead(
    evictable: ChatMessage[],
    maxTokens: number,
    maxMessages: number,
    tokenCounter: (msg: ChatMessage) => number
  ): ChatMessage[] {
    if (evictable.length === 0) return evictable

    const result = [...evictable]
    let totalTokens = result.reduce((sum, msg) => sum + tokenCounter(msg), 0)
    let totalMessages = result.length

    let i = 0
    while ((totalTokens > maxTokens || totalMessages > maxMessages) && i < result.length) {
      const msg = result[i]
      if (!msg) break

      // Atomic eviction: assistant + tool_calls must be removed with tool messages
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        const toolCallIds = new Set(msg.toolCalls.map((tc: ToolCall) => tc.id))

        // Find all consecutive tool messages
        let toolEndIndex = i + 1
        while (
          toolEndIndex < result.length &&
          result[toolEndIndex]?.role === 'tool' &&
          toolCallIds.has(result[toolEndIndex]?.toolCallId ?? '')
        ) {
          toolEndIndex++
        }

        // Calculate tokens for the entire block
        const blockTokens = result
          .slice(i, toolEndIndex)
          .reduce((s, m) => s + (m ? tokenCounter(m) : 0), 0)
        const blockMessages = toolEndIndex - i

        // Remove the entire block atomically
        result.splice(i, blockMessages)
        totalTokens -= blockTokens
        totalMessages -= blockMessages
      } else if (msg.role === 'tool') {
        // Orphan tool message (defensive handling)
        log.warn({ toolCallId: msg.toolCallId }, '[Truncation] Orphan tool message detected, removing')
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
        totalMessages -= 1
      } else {
        // Regular message (user, assistant without tool_calls)
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
        totalMessages -= 1
      }
    }

    return result
  }

  /**
   * Count tokens in a message array
   */
  private countTokens(
    messages: ChatMessage[],
    tokenCounter: (msg: ChatMessage) => number
  ): number {
    return messages.reduce((sum, msg) => sum + tokenCounter(msg), 0)
  }

  /**
   * Count tokens in message segments
   */
  private countTokensInSegments(
    segments: MessageSegments,
    tokenCounter: (msg: ChatMessage) => number
  ): number {
    return (
      this.countTokens(segments.system, tokenCounter) +
      this.countTokens(segments.evictable, tokenCounter) +
      this.countTokens(segments.protected, tokenCounter)
    )
  }

  /**
   * Apply fallback strategy when normal truncation fails
   */
  private applyFallback(
    messages: ChatMessage[],
    tokenCounter: (msg: ChatMessage) => number
  ): ChatMessage[] {
    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      return [lastUserMessage]
    }

    // Extreme case: no user message at all
    return []
  }

  /**
   * Validates that all tool messages have corresponding tool_calls
   *
   * @param messages - Array of chat messages to validate
   * @returns true if valid, false if orphan tool messages found
   */
  validateMessagePairs(messages: ChatMessage[]): boolean {
    const toolCallIds = new Set<string>()
    let hasOrphanToolMessage = false

    for (const msg of messages) {
      // Collect all tool_call IDs from assistant messages
      if (msg.role === 'assistant' && msg.toolCalls) {
        msg.toolCalls.forEach((tc: ToolCall) => toolCallIds.add(tc.id))
      }

      // Validate tool messages have corresponding tool_calls
      if (msg.role === 'tool') {
        if (!msg.toolCallId || !toolCallIds.has(msg.toolCallId)) {
          log.error(
            { toolCallId: msg.toolCallId },
            '[MessageTokenTruncator] Orphan tool message detected'
          )
          hasOrphanToolMessage = true
        }
      }
    }

    return !hasOrphanToolMessage
  }
}
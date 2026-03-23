/**
 * Message Token Truncator
 * Truncates ChatMessage[] arrays while preserving tool_call/tool_output pairing
 *
 * CRITICAL: In multi-turn Function Calling scenarios, truncating history may split
 * tool_call requests from their corresponding tool_output results. This breaks
 * LLM API validation (400 Bad Request).
 *
 * This module ensures tool_call and tool_result are always removed together.
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
 * MessageTokenTruncator - Truncates message arrays while preserving tool pairing
 *
 * Rules:
 * 1. When removing an assistant message with tool_calls, also remove corresponding tool role messages
 * 2. Never allow tool role messages to appear without their corresponding assistant tool_calls
 * 3. If validation fails after truncation, fallback to keeping only the last user message
 */
export class MessageTokenTruncator {
  /**
   * Truncates message array to fit within token limit
   * Preserves tool_call/tool_output pairing during truncation
   *
   * @param messages - Array of chat messages
   * @param maxTokens - Maximum allowed tokens
   * @param tokenCounter - Function to count tokens in a message
   * @returns Truncated message array
   */
  truncate(
    messages: ChatMessage[],
    maxTokens: number,
    tokenCounter: (msg: ChatMessage) => number
  ): ChatMessage[] {
    if (messages.length === 0) return messages

    // Calculate current token total
    let totalTokens = messages.reduce((sum, msg) => sum + tokenCounter(msg), 0)

    // If no truncation needed, return a copy to avoid reference issues
    if (totalTokens <= maxTokens) return [...messages]

    // Work with a copy
    const result = [...messages]
    let i = 0

    // Remove messages from the head while protecting tool pairing
    while (totalTokens > maxTokens && i < result.length) {
      const msg = result[i]
      if (!msg) break

      // Check if this is an assistant message with tool_calls
      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        // Find all corresponding tool messages
        const toolCallIds = new Set(msg.toolCalls.map((tc: ToolCall) => tc.id))
        let toolMessagesToRemove = 0

        // Count consecutive tool messages that match this tool_calls
        for (let j = i + 1; j < result.length; j++) {
          const nextMsg = result[j]
          if (!nextMsg) break
          if (nextMsg.role === 'tool' && toolCallIds.has(nextMsg.toolCallId ?? '')) {
            toolMessagesToRemove++
          } else {
            break // Stop when we hit a non-matching message
          }
        }

        // Calculate tokens to remove (assistant + tool messages)
        const messagesToRemove = result.slice(i, i + 1 + toolMessagesToRemove)
        const tokensToRemove = messagesToRemove.reduce((sum, m) => {
          if (!m) return sum
          return sum + tokenCounter(m)
        }, 0)

        // Remove the pair together
        result.splice(i, 1 + toolMessagesToRemove)
        totalTokens -= tokensToRemove
        // Don't increment i, as we removed elements and the next element is now at index i
      } else if (msg.role === 'tool') {
        // Orphan tool message (no corresponding tool_calls) - should not happen
        log.warn({ toolCallId: msg.toolCallId }, 'Orphan tool message detected, removing')
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
        // Don't increment i
      } else {
        // Regular message (user, system, assistant without tool_calls)
        result.splice(i, 1)
        totalTokens -= tokenCounter(msg)
        // Don't increment i
      }
    }

    // Validate the result
    const isValid = this.validateMessagePairs(result)

    // Fallback: if validation fails OR result is empty, keep only the last user message
    if (!isValid || result.length === 0) {
      log.error(
        { originalLength: messages.length, truncatedLength: result.length, isValid },
        '[MessageTokenTruncator] Validation failed or empty result, applying fallback: keeping last user message only'
      )

      // Find the last user message
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMessage) {
        return [lastUserMessage]
      }

      // Extreme case: no user message at all
      return []
    }

    return result
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

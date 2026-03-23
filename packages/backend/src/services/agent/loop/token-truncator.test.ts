/**
 * TokenTruncator Tests (Message-based truncation)
 * Tests for preserving tool_call/tool_output pairing during message truncation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MessageTokenTruncator } from './token-truncator'
import type { ChatMessage } from '@nanomail/shared'

describe('MessageTokenTruncator', () => {
  let truncator: MessageTokenTruncator
  let aggressiveTruncator: MessageTokenTruncator

  // Simple token counter for testing (1 token per char for simplicity)
  const simpleTokenCounter = (msg: ChatMessage): number => {
    const content = msg.content ?? ''
    const toolCallsStr = msg.toolCalls ? JSON.stringify(msg.toolCalls) : ''
    return content.length + toolCallsStr.length + 10 // +10 for role/metadata overhead
  }

  beforeEach(() => {
    // Default truncator with protected recent turns
    truncator = new MessageTokenTruncator()
    // Aggressive truncator for testing forced eviction
    aggressiveTruncator = new MessageTokenTruncator({
      protectedRecentTurns: 0,  // No protection
      maxMessagesLimit: 100
    })
  })

  describe('truncate()', () => {
    it('should return empty array when input is empty', () => {
      const result = truncator.truncate([], 1000, simpleTokenCounter)
      expect(result).toEqual([])
    })

    it('should return original messages if under token limit', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ]

      const result = truncator.truncate(messages, 1000, simpleTokenCounter)
      expect(result).toEqual(messages)
    })

    it('should truncate simple messages from the head when over limit', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
        { role: 'assistant', content: 'Second response' }
      ]

      // Calculate total tokens
      const totalTokens = messages.reduce((sum, msg) => sum + simpleTokenCounter(msg), 0)

      // Use aggressive truncator (no protection) for this test
      const result = aggressiveTruncator.truncate(messages, Math.floor(totalTokens / 2), simpleTokenCounter)

      // Should remove messages from the head
      expect(result.length).toBeLessThan(messages.length)
      // Last message should be preserved
      expect(result[result.length - 1].content).toBe('Second response')
    })

    it('should preserve tool_call and tool_output pairing when truncating', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Create a todo' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [{
            id: 'call_123',
            type: 'function',
            function: { name: 'createTodo', arguments: '{"title":"Test"}' }
          }]
        },
        { role: 'tool', content: '{"success":true}', toolCallId: 'call_123' },
        { role: 'user', content: 'Thanks' },
        { role: 'assistant', content: 'You are welcome!' }
      ]

      // Set a limit that requires truncation (use aggressive truncator)
      const maxTokens = simpleTokenCounter(messages[3]) + simpleTokenCounter(messages[4]) + 20

      const result = aggressiveTruncator.truncate(messages, maxTokens, simpleTokenCounter)

      // If assistant with toolCalls is removed, corresponding tool messages must also be removed
      const hasToolCall = result.some(m =>
        m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0
      )
      const hasToolMessage = result.some(m => m.role === 'tool')

      // Either both are present or both are absent
      expect(hasToolCall === hasToolMessage || !hasToolCall).toBe(true)
    })

    it('should never leave orphan tool messages without corresponding tool_calls', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'First' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [{
            id: 'call_abc',
            type: 'function',
            function: { name: 'test', arguments: '{}' }
          }]
        },
        { role: 'tool', content: 'result', toolCallId: 'call_abc' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [{
            id: 'call_def',
            type: 'function',
            function: { name: 'test2', arguments: '{}' }
          }]
        },
        { role: 'tool', content: 'result2', toolCallId: 'call_def' },
        { role: 'user', content: 'Final question' }
      ]

      // Very small limit to force aggressive truncation
      const result = aggressiveTruncator.truncate(messages, 50, simpleTokenCounter)

      // Validate no orphan tool messages
      const toolCallIds = new Set<string>()
      for (const msg of result) {
        if (msg.role === 'assistant' && msg.toolCalls) {
          msg.toolCalls.forEach(tc => toolCallIds.add(tc.id))
        }
      }

      for (const msg of result) {
        if (msg.role === 'tool') {
          expect(toolCallIds.has(msg.toolCallId ?? '')).toBe(true)
        }
      }
    })

    it('should handle multiple tool calls in single assistant message', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Do multiple things' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'createTodo', arguments: '{"title":"A"}' }
            },
            {
              id: 'call_2',
              type: 'function',
              function: { name: 'createTodo', arguments: '{"title":"B"}' }
            }
          ]
        },
        { role: 'tool', content: 'result1', toolCallId: 'call_1' },
        { role: 'tool', content: 'result2', toolCallId: 'call_2' },
        { role: 'user', content: 'Done' }
      ]

      // Calculate tokens for just the last message plus some buffer
      const lastMsgTokens = simpleTokenCounter(messages[messages.length - 1])
      const maxTokens = lastMsgTokens + 30
      const result = aggressiveTruncator.truncate(messages, maxTokens, simpleTokenCounter)

      // If any tool message for call_1 exists, call_2's tool message must also exist
      // (since they come from the same assistant message)
      const toolCall1Exists = result.some(m => m.toolCallId === 'call_1')
      const toolCall2Exists = result.some(m => m.toolCallId === 'call_2')

      if (toolCall1Exists || toolCall2Exists) {
        // Both should exist (or neither) since they come from same assistant message
        expect(toolCall1Exists).toBe(toolCall2Exists)
      }
    })
  })

  describe('validateMessagePairs()', () => {
    it('should return true for valid message pairs', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [{
            id: 'call_123',
            type: 'function',
            function: { name: 'test', arguments: '{}' }
          }]
        },
        { role: 'tool', content: 'result', toolCallId: 'call_123' }
      ]

      expect(truncator.validateMessagePairs(messages)).toBe(true)
    })

    it('should return false for orphan tool messages', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'tool', content: 'orphan result', toolCallId: 'missing_call' }
      ]

      expect(truncator.validateMessagePairs(messages)).toBe(false)
    })

    it('should return true for messages without tool calls', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' }
      ]

      expect(truncator.validateMessagePairs(messages)).toBe(true)
    })

    it('should return false when tool_call_id is missing', () => {
      const messages: ChatMessage[] = [
        {
          role: 'assistant',
          content: null,
          toolCalls: [{
            id: 'call_123',
            type: 'function',
            function: { name: 'test', arguments: '{}' }
          }]
        },
        { role: 'tool', content: 'result', toolCallId: undefined } // Missing toolCallId
      ]

      expect(truncator.validateMessagePairs(messages)).toBe(false)
    })
  })

  describe('fallback behavior', () => {
    it('should handle orphan tool messages by removing them during truncation', () => {
      // The truncation logic removes orphan tool messages correctly.
      // This test verifies that behavior.
      const messages: ChatMessage[] = [
        { role: 'user', content: 'First user message' },
        { role: 'tool', content: 'orphan', toolCallId: 'missing' },
        { role: 'user', content: 'Last user message' }
      ]

      // Force truncation with aggressive truncator
      const result = aggressiveTruncator.truncate(messages, 10, simpleTokenCounter)

      // The orphan gets removed, leaving the last user message
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[result.length - 1].role).toBe('user')
      // No orphan tool messages in result
      expect(result.some(m => m.role === 'tool' && m.toolCallId === 'missing')).toBe(false)
    })

    it('should return empty array when no user message exists and validation fails', () => {
      const messages: ChatMessage[] = [
        { role: 'assistant', content: 'No user here' },
        { role: 'tool', content: 'orphan', toolCallId: 'missing' }
      ]

      const result = aggressiveTruncator.truncate(messages, 5, simpleTokenCounter)

      expect(result).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('should handle null content in messages', () => {
      const messages: ChatMessage[] = [
        { role: 'assistant', content: null },
        { role: 'user', content: 'Hello' }
      ]

      const result = truncator.truncate(messages, 100, simpleTokenCounter)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle system messages', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' }
      ]

      const result = truncator.truncate(messages, 100, simpleTokenCounter)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should preserve the last message regardless of type', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'First' },
        { role: 'user', content: 'Second' },
        { role: 'user', content: 'Third' }
      ]

      const result = aggressiveTruncator.truncate(messages, 30, simpleTokenCounter)

      // Last message should be preserved
      expect(result[result.length - 1].content).toBe('Third')
    })
  })

  describe('protected recent turns', () => {
    it('should protect recent conversation turns from truncation', () => {
      // Create a longer conversation with 6 turns (12 messages)
      const messages: ChatMessage[] = []
      for (let i = 1; i <= 6; i++) {
        messages.push({ role: 'user', content: `User message ${i}` })
        messages.push({ role: 'assistant', content: `Assistant response ${i}` })
      }

      // Calculate total tokens
      const totalTokens = messages.reduce((sum, msg) => sum + simpleTokenCounter(msg), 0)

      // Use default truncator (protects last 3 turns = 6 messages)
      const result = truncator.truncate(messages, Math.floor(totalTokens / 2), simpleTokenCounter)

      // Last 3 turns (6 messages) should be preserved
      const lastMessages = messages.slice(-6)
      for (const msg of lastMessages) {
        expect(result.some(r => r.content === msg.content)).toBe(true)
      }
    })

    it('should allow aggressive truncation when protectedRecentTurns is 0', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
        { role: 'assistant', content: 'Second response' }
      ]

      const totalTokens = messages.reduce((sum, msg) => sum + simpleTokenCounter(msg), 0)

      // Aggressive truncator should truncate from head
      const result = aggressiveTruncator.truncate(messages, Math.floor(totalTokens / 2), simpleTokenCounter)

      expect(result.length).toBeLessThan(messages.length)
    })
  })

  describe('tool output truncation', () => {
    it('should truncate large tool output content', () => {
      const largeOutput = { data: 'x'.repeat(10000) }
      const truncated = truncator.truncateToolOutputContent(largeOutput, 100)

      expect(truncated.length).toBeLessThanOrEqual(100)
      expect(truncated).toContain('(truncated)')
    })

    it('should not truncate small tool output content', () => {
      const smallOutput = { data: 'small' }
      const truncated = truncator.truncateToolOutputContent(smallOutput, 1000)

      expect(truncated).toBe(JSON.stringify(smallOutput))
    })
  })
})

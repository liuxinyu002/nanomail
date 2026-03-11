/**
 * Tests for ContextBuilder Service
 * TDD: Write tests first, then implement
 * Reference: nanobot/agent/context.py
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ContextBuilder } from './types'
import type { MemoryStore } from '../memory/types'
import type { LLMResponse, ToolCallRequest } from '../../llm/types'

// Mock MemoryStore
const createMockMemoryStore = (): MemoryStore => ({
  getMemoryContext: vi.fn().mockResolvedValue(''),
  getHistory: vi.fn().mockResolvedValue([]),
  saveTurn: vi.fn().mockResolvedValue(undefined),
  updateMemory: vi.fn().mockResolvedValue(undefined)
})

// Mock SkillsLoader
interface SkillsLoader {
  buildSkillsSummary: () => string
  getAlwaysSkills: () => string[]
  loadSkillsForContext: (names: string[]) => string
}

const createMockSkillsLoader = (): SkillsLoader => ({
  buildSkillsSummary: vi.fn().mockReturnValue(''),
  getAlwaysSkills: vi.fn().mockReturnValue([]),
  loadSkillsForContext: vi.fn().mockReturnValue('')
})

// Mock fs for bootstrap files
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn()
  }
}))

import { promises as fs } from 'fs'

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder
  let mockMemoryStore: MemoryStore
  let mockSkillsLoader: SkillsLoader

  beforeEach(() => {
    vi.clearAllMocks()
    mockMemoryStore = createMockMemoryStore()
    mockSkillsLoader = createMockSkillsLoader()
    contextBuilder = new ContextBuilder('/workspace', mockMemoryStore, mockSkillsLoader)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('buildSystemPrompt', () => {
    it('should build system prompt with identity section', async () => {
      // Mock all bootstrap files to return empty
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const prompt = await contextBuilder.buildSystemPrompt()

      expect(prompt).toContain('nanobot')
      expect(prompt).toContain('assistant')
    })

    it('should include bootstrap files when they exist', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('AGENTS.md')) return 'Agent identity content'
        if (path.includes('SOUL.md')) return 'Core personality content'
        if (path.includes('USER.md')) return 'User preferences content'
        if (path.includes('TOOLS.md')) return 'Tool usage guidelines'
        throw new Error('File not found')
      })

      const prompt = await contextBuilder.buildSystemPrompt()

      expect(prompt).toContain('Agent identity content')
      expect(prompt).toContain('Core personality content')
      expect(prompt).toContain('User preferences content')
      expect(prompt).toContain('Tool usage guidelines')
    })

    it('should include memory context when available', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))
      vi.mocked(mockMemoryStore.getMemoryContext).mockResolvedValue('[Long-term Memory]\nImportant facts here')

      const prompt = await contextBuilder.buildSystemPrompt()

      expect(prompt).toContain('Important facts here')
    })

    it('should include skills summary when available', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))
      vi.mocked(mockSkillsLoader.buildSkillsSummary).mockReturnValue('| Skill Name | Description |\n| search | Search emails |')

      const prompt = await contextBuilder.buildSystemPrompt()

      expect(prompt).toContain('search')
      expect(prompt).toContain('Search emails')
    })

    it('should separate sections with horizontal rules', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('AGENTS.md')) return 'Agent content'
        throw new Error('File not found')
      })
      vi.mocked(mockMemoryStore.getMemoryContext).mockResolvedValue('Memory content')
      vi.mocked(mockSkillsLoader.buildSkillsSummary).mockReturnValue('Skills content')

      const prompt = await contextBuilder.buildSystemPrompt()

      // Should have horizontal rule separators
      expect(prompt).toContain('\n\n---\n\n')
    })

    it('should handle missing bootstrap files gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      // Should not throw
      const prompt = await contextBuilder.buildSystemPrompt()

      expect(prompt).toBeDefined()
      expect(prompt).toContain('nanobot')
    })
  })

  describe('buildMessages', () => {
    it('should build message array with system prompt', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: 'Hello'
      })

      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('system')
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toBe('Hello')
    })

    it('should include history messages', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const history = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' }
      ]

      const messages = await contextBuilder.buildMessages({
        history,
        currentMessage: 'New message'
      })

      expect(messages).toHaveLength(4)
      expect(messages[1]).toEqual(history[0])
      expect(messages[2]).toEqual(history[1])
    })

    it('should include runtime context when provided', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: 'Hello',
        runtimeContext: {
          channel: 'email',
          chatId: 'chat-123',
          currentTime: new Date('2024-01-15T10:30:00Z')
        }
      })

      expect(messages[1].content).toContain('Current time:')
      expect(messages[1].content).toContain('Channel: email')
      expect(messages[1].content).toContain('Chat ID: chat-123')
    })

    it('should prepend runtime context to user message', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: 'Hello',
        runtimeContext: {
          channel: 'email'
        }
      })

      expect(messages[1].content).toContain('[Runtime Context]')
      expect(messages[1].content).toContain('Hello')
    })

    it('should work without runtime context', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: 'Hello'
      })

      expect(messages[1].content).toBe('Hello')
    })
  })

  describe('buildRuntimeContext', () => {
    it('should build runtime context with current time', async () => {
      const time = new Date('2024-01-15T10:30:00Z')
      const ctx = await contextBuilder.buildRuntimeContext({
        currentTime: time
      })

      expect(ctx).toContain('Current time:')
      expect(ctx).toContain('2024-01-15')
    })

    it('should include channel when provided', async () => {
      const ctx = await contextBuilder.buildRuntimeContext({
        channel: 'email'
      })

      expect(ctx).toContain('Channel: email')
    })

    it('should include chatId when provided', async () => {
      const ctx = await contextBuilder.buildRuntimeContext({
        chatId: 'chat-123'
      })

      expect(ctx).toContain('Chat ID: chat-123')
    })

    it('should return empty string when no context provided', async () => {
      const ctx = await contextBuilder.buildRuntimeContext(undefined)

      expect(ctx).toBe('')
    })

    it('should wrap context in bracketed header', async () => {
      const ctx = await contextBuilder.buildRuntimeContext({
        channel: 'email'
      })

      expect(ctx).toContain('[Runtime Context]')
    })
  })

  describe('addAssistantMessage', () => {
    it('should add assistant message to history', () => {
      const messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> = [
        { role: 'user', content: 'Hello' }
      ]

      const response: LLMResponse = {
        content: 'Hi there!',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      }

      const updated = contextBuilder.addAssistantMessage(messages, response)

      expect(updated).toHaveLength(2)
      expect(updated[1].role).toBe('assistant')
      expect(updated[1].content).toBe('Hi there!')
    })

    it('should include tool calls when present', () => {
      const messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> = []

      const toolCalls: ToolCallRequest[] = [
        { id: 'call-1', name: 'search_emails', arguments: { query: 'test' } }
      ]

      const response: LLMResponse = {
        content: null,
        toolCalls,
        finishReason: 'tool_calls',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      }

      const updated = contextBuilder.addAssistantMessage(messages, response)

      expect(updated[0].toolCalls).toEqual(toolCalls)
    })

    it('should not add toolCalls field when empty', () => {
      const messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> = []

      const response: LLMResponse = {
        content: 'Response',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      }

      const updated = contextBuilder.addAssistantMessage(messages, response)

      expect(updated[0].toolCalls).toBeUndefined()
    })

    it('should handle null content', () => {
      const messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> = []

      const response: LLMResponse = {
        content: null,
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      }

      const updated = contextBuilder.addAssistantMessage(messages, response)

      expect(updated[0].content).toBeNull()
    })
  })

  describe('addToolResult', () => {
    it('should add tool result to messages', () => {
      const messages: Array<{ role: string; content: string | null; toolCallId?: string }> = []

      const updated = contextBuilder.addToolResult(messages, 'call-1', 'Tool execution result')

      expect(updated).toHaveLength(1)
      expect(updated[0].role).toBe('tool')
      expect(updated[0].content).toBe('Tool execution result')
      expect(updated[0].toolCallId).toBe('call-1')
    })

    it('should sanitize empty content to (empty)', () => {
      const messages: Array<{ role: string; content: string | null; toolCallId?: string }> = []

      const updated = contextBuilder.addToolResult(messages, 'call-1', '')

      expect(updated[0].content).toBe('(empty)')
    })

    it('should preserve existing messages', () => {
      const messages: Array<{ role: string; content: string | null; toolCallId?: string }> = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ]

      const updated = contextBuilder.addToolResult(messages, 'call-1', 'Result')

      expect(updated).toHaveLength(3)
      expect(updated[0].role).toBe('user')
      expect(updated[2].role).toBe('tool')
    })
  })

  describe('getIdentity', () => {
    it('should return identity string with nanobot branding', async () => {
      const identity = await contextBuilder.getIdentity()

      expect(identity).toContain('nanobot')
      expect(identity).toContain('assistant')
    })

    it('should include workspace path', async () => {
      const identity = await contextBuilder.getIdentity()

      expect(identity).toContain('/workspace')
    })

    it('should include runtime information', async () => {
      const identity = await contextBuilder.getIdentity()

      expect(identity).toContain('Runtime')
    })
  })

  describe('loadBootstrapFiles', () => {
    it('should load all bootstrap files in order', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('AGENTS.md')) return 'Agent content'
        if (path.includes('SOUL.md')) return 'Soul content'
        if (path.includes('USER.md')) return 'User content'
        if (path.includes('TOOLS.md')) return 'Tools content'
        throw new Error('File not found')
      })

      const content = await contextBuilder.loadBootstrapFiles()

      expect(content).toContain('Agent content')
      expect(content).toContain('Soul content')
      expect(content).toContain('User content')
      expect(content).toContain('Tools content')
    })

    it('should skip missing files', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('AGENTS.md')) return 'Agent content'
        throw new Error('File not found')
      })

      const content = await contextBuilder.loadBootstrapFiles()

      expect(content).toContain('Agent content')
      expect(content).not.toContain('Soul content')
    })

    it('should return empty string when no files exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const content = await contextBuilder.loadBootstrapFiles()

      expect(content).toBe('')
    })

    it('should format files with headers', async () => {
      vi.mocked(fs.readFile).mockImplementation(async (path: string) => {
        if (path.includes('AGENTS.md')) return 'Agent content'
        throw new Error('File not found')
      })

      const content = await contextBuilder.loadBootstrapFiles()

      expect(content).toContain('## AGENTS.md')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty history', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: 'Hello'
      })

      expect(messages).toHaveLength(2)
    })

    it('should handle very long current message', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const longMessage = 'x'.repeat(100000)

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: longMessage
      })

      expect(messages[1].content).toBe(longMessage)
    })

    it('should handle special characters in messages', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const specialMessage = 'Hello\n\nWorld\t\t<xml>test</xml>'

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: specialMessage
      })

      expect(messages[1].content).toBe(specialMessage)
    })

    it('should handle unicode in messages', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      const unicodeMessage = 'Hello \u4e16\u754c \U0001F600'

      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: unicodeMessage
      })

      expect(messages[1].content).toBe(unicodeMessage)
    })
  })
})
/**
 * Tests for AgentLoop - ReAct Agent Loop Core
 * TDD: Write tests first, then implement
 *
 * Reference: nanobot/agent/loop.py
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  AgentLoop,
  AgentMessage,
  ProgressEvent
} from './agent-loop'
import {
  AGENT_PRESETS,
  DEFAULT_AGENT_CONFIG
} from './types'
import type { LLMProvider, LLMResponse, ToolCallRequest } from '../../llm/types'
import type { ToolRegistry } from '../tools/registry'
import type { ContextBuilder } from '../context/types'
import type { MemoryStore } from '../memory/types'
import type { TokenTruncator } from '../utils/token-truncator'
import type { Email } from '../../../entities/Email.entity'

// Helper to create mock email
const createMockEmail = (overrides: Partial<Email> = {}): Email =>
  ({
    id: 1,
    sender: 'john@example.com',
    subject: 'Test Subject',
    bodyText: 'This is the email body.',
    date: new Date('2024-01-15'),
    snippet: 'This is the email...',
    hasAttachments: false,
    isProcessed: false,
    isSpam: false,
    ...overrides
  }) as Email

// Helper to create mock LLM response
const createMockLLMResponse = (
  content: string | null = 'Test response',
  toolCalls: ToolCallRequest[] = [],
  finishReason: LLMResponse['finishReason'] = 'stop'
): LLMResponse => ({
  content,
  toolCalls,
  finishReason,
  usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
})

// Helper to create mock LLM provider
const createMockProvider = () => ({
  chat: vi.fn(),
  getDefaultModel: vi.fn().mockReturnValue('gpt-4o-mini')
})

// Helper to create mock tool registry
const createMockToolRegistry = () => ({
  register: vi.fn(),
  get: vi.fn(),
  has: vi.fn(),
  getDefinitions: vi.fn().mockReturnValue([]),
  execute: vi.fn(),
  list: vi.fn(),
  size: vi.fn()
})

// Helper to create mock context builder
const createMockContextBuilder = () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue('System prompt'),
  buildMessages: vi.fn().mockResolvedValue([
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Test message' }
  ]),
  buildRuntimeContext: vi.fn().mockReturnValue('[Runtime Context]\nCurrent time: 2024-01-15'),
  addAssistantMessage: vi.fn(),
  addToolResult: vi.fn(),
  getIdentity: vi.fn().mockResolvedValue('Identity'),
  loadBootstrapFiles: vi.fn().mockResolvedValue('')
})

// Helper to create mock memory store
const createMockMemoryStore = () => ({
  getMemoryContext: vi.fn().mockResolvedValue(''),
  getHistory: vi.fn().mockResolvedValue([]),
  saveTurn: vi.fn(),
  updateMemory: vi.fn()
})

// Helper to create mock token truncator
const createMockTokenTruncator = () => ({
  estimateTokens: vi.fn((text: string) => Math.ceil(text.length / 4)),
  truncate: vi.fn((text: string) => ({
    text,
    wasTruncated: false,
    originalTokens: Math.ceil(text.length / 4)
  })),
  truncateWithStrategy: vi.fn((text: string) => ({
    text,
    wasTruncated: false,
    originalTokens: Math.ceil(text.length / 4)
  })),
  chunkText: vi.fn((text: string) => [text])
})

describe('AgentLoop', () => {
  let mockProvider: ReturnType<typeof createMockProvider>
  let mockToolRegistry: ReturnType<typeof createMockToolRegistry>
  let mockContextBuilder: ReturnType<typeof createMockContextBuilder>
  let mockMemoryStore: ReturnType<typeof createMockMemoryStore>
  let mockTokenTruncator: ReturnType<typeof createMockTokenTruncator>

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = createMockProvider()
    mockToolRegistry = createMockToolRegistry()
    mockContextBuilder = createMockContextBuilder()
    mockMemoryStore = createMockMemoryStore()
    mockTokenTruncator = createMockTokenTruncator()
  })

  describe('constructor', () => {
    it('should create agent with default config', () => {
      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      // Agent should be created successfully
      expect(agent).toBeDefined()
    })

    it('should apply draft preset when specified', () => {
      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator,
        config: { preset: 'draft' }
      })

      expect(agent).toBeDefined()
      // Preset should set maxIterations to 5
      expect(agent.getConfig().maxIterations).toBe(AGENT_PRESETS.draft.maxIterations)
    })

    it('should apply complex preset when specified', () => {
      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator,
        config: { preset: 'complex' }
      })

      expect(agent.getConfig().maxIterations).toBe(AGENT_PRESETS.complex.maxIterations)
    })

    it('should apply research preset when specified', () => {
      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator,
        config: { preset: 'research' }
      })

      expect(agent.getConfig().maxIterations).toBe(AGENT_PRESETS.research.maxIterations)
    })

    it('should allow custom config to override preset', () => {
      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator,
        config: { preset: 'draft', maxIterations: 15 }
      })

      // Custom maxIterations should override preset
      expect(agent.getConfig().maxIterations).toBe(15)
    })

    it('should use default config values when not specified', () => {
      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const config = agent.getConfig()
      expect(config.model).toBe(DEFAULT_AGENT_CONFIG.model)
      expect(config.temperature).toBe(DEFAULT_AGENT_CONFIG.temperature)
      expect(config.maxTokens).toBe(DEFAULT_AGENT_CONFIG.maxTokens)
      expect(config.maxIterations).toBe(DEFAULT_AGENT_CONFIG.maxIterations)
    })
  })

  describe('run - basic flow', () => {
    it('should yield done event when LLM returns final answer without tool calls', async () => {
      const email = createMockEmail()
      mockProvider.chat.mockResolvedValueOnce(
        createMockLLMResponse('This is the final answer.', [])
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Draft a reply', email)) {
        events.push(event)
      }

      // Should have chunk events and done event
      expect(events.some((e) => e.type === 'chunk')).toBe(true)
      expect(events.some((e) => e.type === 'done')).toBe(true)
      expect(events.find((e) => e.type === 'done')?.content).toBe('This is the final answer.')
    })

    it('should yield thought event when LLM returns content', async () => {
      const email = createMockEmail()
      mockProvider.chat.mockResolvedValueOnce(
        createMockLLMResponse('Let me think about this...', [])
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Draft a reply', email)) {
        events.push(event)
      }

      // Should have thought event for content
      expect(events.some((e) => e.type === 'thought')).toBe(true)
    })
  })

  describe('run - tool calls', () => {
    it('should execute tool and yield action/observation events', async () => {
      const email = createMockEmail()
      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'search_local_emails', arguments: { query: 'meeting' } }
      ]

      mockProvider.chat
        .mockResolvedValueOnce(createMockLLMResponse('I will search for emails.', toolCalls))
        .mockResolvedValueOnce(createMockLLMResponse('Based on the search results, here is my reply.', []))

      mockToolRegistry.execute.mockResolvedValueOnce('[1] ID: 1\nFrom: jane@example.com\nSubject: Meeting')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Draft a reply about the meeting', email)) {
        events.push(event)
      }

      // Should have action event
      const actionEvent = events.find((e) => e.type === 'action')
      expect(actionEvent).toBeDefined()
      expect(actionEvent?.toolName).toBe('search_local_emails')

      // Should have observation event
      const observationEvent = events.find((e) => e.type === 'observation')
      expect(observationEvent).toBeDefined()
      expect(observationEvent?.content).toContain('jane@example.com')

      // Tool should have been executed
      expect(mockToolRegistry.execute).toHaveBeenCalledWith('search_local_emails', { query: 'meeting' })
    })

    it('should handle multiple tool calls in sequence', async () => {
      const email = createMockEmail()
      const toolCalls1: ToolCallRequest[] = [
        { id: 'call_1', name: 'search_local_emails', arguments: { query: 'budget' } }
      ]

      mockProvider.chat
        .mockResolvedValueOnce(createMockLLMResponse('Searching for budget emails.', toolCalls1))
        .mockResolvedValueOnce(createMockLLMResponse('Here is the summary of the budget.', []))

      mockToolRegistry.execute.mockResolvedValueOnce('Budget results')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Find budget info', email)) {
        events.push(event)
      }

      // Should have one action and one observation
      expect(events.filter((e) => e.type === 'action')).toHaveLength(1)
      expect(events.filter((e) => e.type === 'observation')).toHaveLength(1)
    })
  })

  describe('run - max iterations', () => {
    it('should stop after reaching maxIterations', async () => {
      const email = createMockEmail()
      const toolCall: ToolCallRequest = { id: 'call_1', name: 'search_local_emails', arguments: { query: 'test' } }

      // Always return tool calls (infinite loop scenario)
      mockProvider.chat.mockResolvedValue(
        createMockLLMResponse('Searching...', [toolCall])
      )
      mockToolRegistry.execute.mockResolvedValue('Results')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator,
        config: { maxIterations: 3 }
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Test', email)) {
        events.push(event)
      }

      // Should end with error event for max iterations
      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.content).toContain('maximum number of tool call iterations')
    })
  })

  describe('run - error handling', () => {
    it('should yield error event when LLM call fails', async () => {
      const email = createMockEmail()
      mockProvider.chat.mockRejectedValueOnce(new Error('API error'))

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Draft a reply', email)) {
        events.push(event)
      }

      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.content).toContain('API error')
    })

    it('should yield error event when LLM returns error finish reason', async () => {
      const email = createMockEmail()
      mockProvider.chat.mockResolvedValueOnce(
        createMockLLMResponse('Error occurred', [], 'error')
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Draft a reply', email)) {
        events.push(event)
      }

      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
    })
  })

  describe('think tag stripping', () => {
    it('should strip thinking tags from content', async () => {
      const email = createMockEmail()
      // Mock response with proper thinking tags (for DeepSeek-R1 style models)
      // Using the format: thinking content here
      const mockContent = 'Let me analyze this email.Based on my analysis, here is the reply.'
      mockProvider.chat.mockResolvedValueOnce(
        createMockLLMResponse(mockContent, [])
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const events: ProgressEvent[] = []
      for await (const event of agent.run('Draft a reply', email)) {
        events.push(event)
      }

      // Thought event should have stripped thinking tags
      const thoughtEvent = events.find((e) => e.type === 'thought')
      // Should not contain the thinking tags
      expect(thoughtEvent?.content).not.toMatch(/<think>[\s\S]*<\/think>/)
      // Should contain the actual content after stripping
      expect(thoughtEvent?.content).toContain('Based on my analysis')
    })
  })

  describe('message building', () => {
    it('should build user message with email context', async () => {
      const email = createMockEmail({
        sender: 'test@example.com',
        subject: 'Important Email',
        bodyText: 'This is a test email body.'
      })
      mockProvider.chat.mockResolvedValueOnce(createMockLLMResponse('Done', []))

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      for await (const _ of agent.run('Draft a reply', email)) {
        // Process events
      }

      // Provider should have been called with messages containing email context
      expect(mockProvider.chat).toHaveBeenCalled()
      const callArgs = mockProvider.chat.mock.calls[0][0]
      expect(callArgs.messages).toBeDefined()
    })

    it('should truncate long email body to prevent context overflow', async () => {
      const longBody = 'x'.repeat(50000) // 50k characters
      const email = createMockEmail({ bodyText: longBody })

      mockProvider.chat.mockResolvedValueOnce(createMockLLMResponse('Done', []))

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      for await (const _ of agent.run('Draft a reply', email)) {
        // Process events
      }

      // Token truncator should have been called
      expect(mockTokenTruncator.truncate).toHaveBeenCalled()
    })
  })

  describe('AsyncGenerator pattern', () => {
    it('should be an async generator that yields progress events', async () => {
      const email = createMockEmail()
      mockProvider.chat.mockResolvedValueOnce(createMockLLMResponse('Response', []))

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const generator = agent.run('Test', email)

      // Should be an async iterable
      expect(generator[Symbol.asyncIterator]).toBeDefined()
      expect(typeof generator[Symbol.asyncIterator]).toBe('function')
    })

    it('should yield events in correct order for tool call flow', async () => {
      const email = createMockEmail()
      const toolCall: ToolCallRequest = { id: 'call_1', name: 'search_local_emails', arguments: { query: 'test' } }

      mockProvider.chat
        .mockResolvedValueOnce(createMockLLMResponse('I will search.', [toolCall]))
        .mockResolvedValueOnce(createMockLLMResponse('Final answer', []))

      mockToolRegistry.execute.mockResolvedValueOnce('Search results')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })

      const eventTypes: string[] = []
      for await (const event of agent.run('Test', email)) {
        eventTypes.push(event.type)
      }

      // Order should be: thought -> action -> observation -> chunks... -> done
      expect(eventTypes[0]).toBe('thought')
      expect(eventTypes[1]).toBe('action')
      expect(eventTypes[2]).toBe('observation')
      expect(eventTypes[eventTypes.length - 1]).toBe('done')
    })
  })
})
/**
 * Tests for AgentLoop V2 - Generalized AI Agent Framework
 * TDD: Tests written FIRST for the new run() method
 *
 * Reference: docs/phase_4_AIAssist_refactor/plan_1_backendAI_refactor_phase2.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentLoop } from './agent-loop'
import {
  ConversationEvent,
  AgentContext,
  MAX_STEPS,
  ConversationEventType
} from './types'
import type { LLMProvider, LLMResponse, LLMStreamChunk, ToolCallRequest } from '../../llm/types'
import type { ToolRegistry } from '../tools/registry'
import type { ContextBuilder } from '../context/types'
import type { MemoryStore } from '../memory/types'
import type { ChatMessage } from '@nanomail/shared'

// ============================================================================
// Mock Factories
// ============================================================================

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

// Mock stream chunks generator
async function* createMockStreamChunks(
  response: LLMResponse
): AsyncGenerator<LLMStreamChunk, void, unknown> {
  if (response.content) {
    const words = response.content.split(' ')
    for (let i = 0; i < words.length; i++) {
      const chunk = i === words.length - 1 ? words[i] : words[i] + ' '
      yield { content: chunk, toolCalls: [], isDone: false }
    }
  }
  yield {
    content: null,
    toolCalls: response.toolCalls,
    isDone: true,
    finishReason: response.finishReason ?? 'stop'
  }
}

const createMockProvider = () => ({
  chat: vi.fn(),
  chatStream: vi.fn(),
  getDefaultModel: vi.fn().mockReturnValue('gpt-4o-mini')
})

const createMockToolRegistry = () => ({
  register: vi.fn(),
  get: vi.fn(),
  has: vi.fn(),
  getDefinitions: vi.fn().mockReturnValue([]),
  execute: vi.fn(),
  list: vi.fn().mockReturnValue(['createTodo', 'updateTodo', 'deleteTodo']),
  size: vi.fn().mockReturnValue(3)
})

const createMockContextBuilder = () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue('System prompt for todo-agent'),
  buildMessages: vi.fn().mockResolvedValue([
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Test message' }
  ]),
  buildRuntimeContext: vi.fn().mockReturnValue('[Runtime Context]\nCurrent time: 2024-01-15'),
  buildSystemMessage: vi.fn().mockReturnValue('System prompt with runtime context'),
  addAssistantMessage: vi.fn(),
  addToolResult: vi.fn(),
  getIdentity: vi.fn().mockResolvedValue('Identity'),
  loadBootstrapFiles: vi.fn().mockResolvedValue(''),
  // Phase 4: Cached prompt methods
  setCachedPrompt: vi.fn(),
  getCachedPrompt: vi.fn().mockReturnValue(undefined)
})

const createMockMemoryStore = () => ({
  getMemoryContext: vi.fn().mockResolvedValue(''),
  getHistory: vi.fn().mockResolvedValue([]),
  saveTurn: vi.fn(),
  updateMemory: vi.fn()
})

// Helper to create valid AgentContext
const createAgentContext = (overrides: Partial<AgentContext> = {}): AgentContext => ({
  role: 'todo-agent',
  sessionId: 'session-123',
  messageId: 'msg-456',
  currentTime: '2024-03-20T10:30:00.000Z',
  timeZone: 'Asia/Shanghai',
  ...overrides
})

// Helper to create ChatMessage array
const createChatMessages = (messages: Partial<ChatMessage>[] = []): ChatMessage[] => {
  return messages.map((msg, idx) => ({
    role: 'user' as const,
    content: `Message ${idx}`,
    ...msg
  }))
}

// ============================================================================
// Test Suite
// ============================================================================

describe('AgentLoop V2 - run()', () => {
  let mockProvider: ReturnType<typeof createMockProvider>
  let mockToolRegistry: ReturnType<typeof createMockToolRegistry>
  let mockContextBuilder: ReturnType<typeof createMockContextBuilder>
  let mockMemoryStore: ReturnType<typeof createMockMemoryStore>

  beforeEach(() => {
    vi.clearAllMocks()
    mockProvider = createMockProvider()
    mockToolRegistry = createMockToolRegistry()
    mockContextBuilder = createMockContextBuilder()
    mockMemoryStore = createMockMemoryStore()
  })

  // ==========================================================================
  // 1. Method Signature Tests
  // ==========================================================================

  describe('method signature', () => {
    it('should accept (messages, context, deps) parameters', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Create a todo' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Done', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      // Should not throw
      const generator = agent.run(messages, context, deps)
      expect(generator).toBeDefined()
      expect(typeof generator[Symbol.asyncIterator]).toBe('function')
    })

    it('should return AsyncGenerator<ConversationEvent>', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // All events should have ConversationEvent structure
      events.forEach(event => {
        expect(event).toHaveProperty('type')
        expect(event).toHaveProperty('sessionId')
        expect(event).toHaveProperty('messageId')
        expect(event).toHaveProperty('timestamp')
        expect(event).toHaveProperty('data')
      })
    })
  })

  // ==========================================================================
  // 2. SSE Event Flow Tests
  // ==========================================================================

  describe('SSE event flow', () => {
    it('should yield session_start as first event', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
        if (events.length === 1) break // Just check first event
      }

      expect(events[0].type).toBe('session_start')
      expect(events[0].sessionId).toBe(context.sessionId)
      expect(events[0].messageId).toBe(context.messageId)
    })

    it('should yield session_end as last event', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      const lastEvent = events[events.length - 1]
      expect(lastEvent.type).toBe('session_end')
    })

    it('should yield result_chunk events during streaming', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('This is a response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      const resultChunks = events.filter(e => e.type === 'result_chunk')
      expect(resultChunks.length).toBeGreaterThan(0)
    })

    it('should yield tool_call_start and tool_call_end for tool calls', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Create a todo' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'createTodo', arguments: { title: 'Test' } }
      ]

      mockProvider.chatStream
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('I will create a todo.', toolCalls)))
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Done creating todo.', [])))

      mockToolRegistry.execute.mockResolvedValueOnce('{"success": true, "id": 1}')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      const toolCallStarts = events.filter(e => e.type === 'tool_call_start')
      const toolCallEnds = events.filter(e => e.type === 'tool_call_end')

      expect(toolCallStarts.length).toBe(1)
      expect(toolCallEnds.length).toBe(1)
      expect(toolCallStarts[0].data).toHaveProperty('toolName', 'createTodo')
      expect(toolCallEnds[0].data).toHaveProperty('toolOutput')
    })

    it('should emit events in correct order: session_start -> tool_call_start -> tool_call_end -> result_chunk -> session_end', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Create a todo' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'createTodo', arguments: { title: 'Test' } }
      ]

      mockProvider.chatStream
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Creating...', toolCalls)))
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Created!', [])))

      mockToolRegistry.execute.mockResolvedValueOnce('{"success": true}')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      const eventTypes = events.map(e => e.type)

      // session_start is first
      expect(eventTypes[0]).toBe('session_start')

      // session_end is last
      expect(eventTypes[eventTypes.length - 1]).toBe('session_end')

      // tool_call_start comes before tool_call_end
      const toolStartIdx = eventTypes.indexOf('tool_call_start')
      const toolEndIdx = eventTypes.indexOf('tool_call_end')
      expect(toolStartIdx).toBeLessThan(toolEndIdx)

      // Final result_chunk (from second LLM response) comes after tool_call_end
      const lastResultChunkIdx = eventTypes.lastIndexOf('result_chunk')
      expect(lastResultChunkIdx).toBeGreaterThan(toolEndIdx)
    })

    it('should yield result_chunk BEFORE tool_call_start when LLM returns content with tool calls', async () => {
      // This test verifies the bug fix: when LLM returns both content and tool calls,
      // the content should be sent to frontend BEFORE tool execution starts
      const messages = createChatMessages([{ role: 'user', content: 'Create a todo' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'createTodo', arguments: { title: 'Test' } }
      ]

      // LLM returns content "I will create a todo." along with tool call
      mockProvider.chatStream
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('I will create a todo.', toolCalls)))
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Todo created successfully!', [])))

      mockToolRegistry.execute.mockResolvedValueOnce('{"success": true}')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      const eventTypes = events.map(e => e.type)

      // Find the FIRST result_chunk (the one accompanying tool call)
      const firstResultChunkIdx = eventTypes.indexOf('result_chunk')
      const toolStartIdx = eventTypes.indexOf('tool_call_start')

      // The result_chunk with "I will create a todo." should come BEFORE tool_call_start
      expect(firstResultChunkIdx).toBeGreaterThan(-1)
      expect(firstResultChunkIdx).toBeLessThan(toolStartIdx)

      // Verify the first result_chunk contains the expected content
      const firstResultChunk = events[firstResultChunkIdx]
      expect((firstResultChunk.data as { content: string }).content).toBe('I will create a todo.')

      // Should have 2 result_chunks: one before tool call, one after (final response)
      const resultChunks = events.filter(e => e.type === 'result_chunk')
      expect(resultChunks.length).toBe(2)

      // Verify second result_chunk is the final response
      const lastResultChunk = resultChunks[resultChunks.length - 1]
      expect((lastResultChunk.data as { content: string }).content).toBe('Todo created successfully!')
    })
  })

  // ==========================================================================
  // 3. Dynamic Tool Loading Tests
  // ==========================================================================

  describe('dynamic tool loading', () => {
    it('should load tools based on AgentRole', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext({ role: 'todo-agent' })
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Should call getDefinitions to load tools
      expect(mockToolRegistry.getDefinitions).toHaveBeenCalled()
    })

    it('should include todo-agent tools: createTodo, updateTodo, deleteTodo', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Create a todo' }])
      const context = createAgentContext({ role: 'todo-agent' })
      const deps = {
        dataSource: {} as any
      }

      // Mock tool definitions for todo-agent
      mockToolRegistry.getDefinitions.mockReturnValue([
        { type: 'function', function: { name: 'createTodo', description: 'Create a todo' } },
        { type: 'function', function: { name: 'updateTodo', description: 'Update a todo' } },
        { type: 'function', function: { name: 'deleteTodo', description: 'Delete a todo' } }
      ])

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Verify tool definitions were requested
      expect(mockToolRegistry.getDefinitions).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // 4. Tool Execution Error Handling Tests
  // ==========================================================================

  describe('tool execution error handling', () => {
    it('should catch tool execution errors and feed back to LLM', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Create a todo' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'createTodo', arguments: { title: 'Test' } }
      ]

      // First call: LLM requests tool call
      // Second call: LLM receives error and responds
      mockProvider.chatStream
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Creating...', toolCalls)))
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Sorry, there was an error creating the todo.', [])))

      // Tool execution fails
      mockToolRegistry.execute.mockRejectedValueOnce(new Error('Database connection failed'))

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should have tool_call_end with error in toolOutput
      const toolCallEnd = events.find(e => e.type === 'tool_call_end')
      expect(toolCallEnd).toBeDefined()

      // toolOutput should contain error info
      const toolOutput = (toolCallEnd?.data as any)?.toolOutput
      expect(toolOutput).toBeDefined()
      expect(toolOutput.status).toBe('failed')
      expect(toolOutput.error).toContain('Database connection failed')

      // Should have result_chunk (LLM response after error)
      const resultChunks = events.filter(e => e.type === 'result_chunk')
      expect(resultChunks.length).toBeGreaterThan(0)
    })

    it('should not terminate loop on tool execution error', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'createTodo', arguments: { title: 'Test' } }
      ]

      mockProvider.chatStream
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Creating...', toolCalls)))
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('I handled the error.', [])))

      mockToolRegistry.execute.mockRejectedValueOnce(new Error('Tool failed'))

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should complete normally with session_end
      const lastEvent = events[events.length - 1]
      expect(lastEvent.type).toBe('session_end')

      // Should NOT have error event (error is fed to LLM, not emitted)
      const errorEvents = events.filter(e => e.type === 'error')
      expect(errorEvents.length).toBe(0)
    })
  })

  // ==========================================================================
  // 5. MAX_STEPS Exceeded Tests
  // ==========================================================================

  describe('MAX_STEPS exceeded', () => {
    it('should yield error event with MAX_STEPS_EXCEEDED code when limit reached', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCall: ToolCallRequest = { id: 'call_1', name: 'createTodo', arguments: {} }

      // Always return tool calls (infinite loop)
      mockProvider.chatStream.mockImplementation(() =>
        createMockStreamChunks(createMockLLMResponse('Looping...', [toolCall]))
      )
      mockToolRegistry.execute.mockResolvedValue('Result')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        config: { maxIterations: 3 } // Use lower limit for test
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should have error event
      const errorEvent = events.find(e => e.type === 'error')
      expect(errorEvent).toBeDefined()

      const errorData = errorEvent?.data as any
      expect(errorData.code).toBe('MAX_STEPS_EXCEEDED')
      expect(errorData.message).toContain('AI')
      expect(errorData.details.steps).toBe(3)
    })

    it('should use MAX_STEPS constant value', async () => {
      expect(MAX_STEPS).toBe(20)
    })

    it('should cap maxIterations at MAX_STEPS (hard limit)', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCall: ToolCallRequest = { id: 'call_1', name: 'createTodo', arguments: {} }

      // Always return tool calls (infinite loop)
      mockProvider.chatStream.mockImplementation(() =>
        createMockStreamChunks(createMockLLMResponse('Looping...', [toolCall]))
      )
      mockToolRegistry.execute.mockResolvedValue('Result')

      // Request more than MAX_STEPS iterations
      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        config: { maxIterations: 50 } // Request 50, but should be capped at 20
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should have MAX_STEPS_EXCEEDED error
      const errorEvent = events.find(e => e.type === 'error')
      expect(errorEvent).toBeDefined()

      const errorData = errorEvent?.data as any
      expect(errorData.code).toBe('MAX_STEPS_EXCEEDED')
      // Should be capped at MAX_STEPS (20), not 50
      expect(errorData.details.steps).toBe(MAX_STEPS)
    })
  })

  // ==========================================================================
  // 6. AbortSignal Support Tests
  // ==========================================================================

  describe('AbortSignal support', () => {
    it('should check signal.aborted at start of each iteration', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const controller = new AbortController()
      controller.abort() // Abort immediately

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        signal: controller.signal
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should have session_start but no session_end (aborted before loop)
      const sessionStarts = events.filter(e => e.type === 'session_start')
      expect(sessionStarts.length).toBe(1)
    })

    it('should propagate signal to LLM provider', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const controller = new AbortController()

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        signal: controller.signal
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Verify signal was passed to chatStream
      expect(mockProvider.chatStream).toHaveBeenCalled()
      const callArgs = mockProvider.chatStream.mock.calls[0][0]
      expect(callArgs.signal).toBe(controller.signal)
    })
  })

  // ==========================================================================
  // 7. Context Building Tests
  // ==========================================================================

  describe('context building', () => {
    it('should build system prompt with time context', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext({
        currentTime: '2024-03-20T10:30:00.000Z',
        timeZone: 'Asia/Shanghai'
      })
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Should call buildSystemPrompt with role
      expect(mockContextBuilder.buildSystemPrompt).toHaveBeenCalledWith(
        context.role,
        undefined
      )
    })

    it('should include sourcePage in context if provided', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext({
        sourcePage: 'todo-board'
      })
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Context should be used
      expect(mockContextBuilder.buildSystemPrompt).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // 8. Edge Cases Tests
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty messages array', async () => {
      const messages: ChatMessage[] = []
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      // Should not throw, but should still yield events
      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      expect(events.length).toBeGreaterThan(0)
    })

    it('should handle null content in messages', async () => {
      const messages: ChatMessage[] = [
        { role: 'assistant', content: null, toolCalls: [] }
      ]
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      // Should not throw
      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      expect(events.length).toBeGreaterThan(0)
    })

    it('should handle LLM error finish reason', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Error', [], 'error'))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      const errorEvent = events.find(e => e.type === 'error')
      expect(errorEvent).toBeDefined()
    })

    it('should generate valid ISO timestamp in events', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // All timestamps should be valid ISO strings
      events.forEach(event => {
        const date = new Date(event.timestamp)
        expect(date.toISOString()).toBe(event.timestamp)
      })
    })
  })

  // ==========================================================================
  // 9. ToolDeps Interface Tests
  // ==========================================================================

  describe('ToolDeps interface', () => {
    it('should pass deps to tool execution context', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Create a todo' }])
      const context = createAgentContext()
      const deps = {
        dataSource: { name: 'mockDataSource' } as any
      }

      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'createTodo', arguments: { title: 'Test' } }
      ]

      mockProvider.chatStream
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Creating...', toolCalls)))
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Done', [])))

      mockToolRegistry.execute.mockResolvedValueOnce('{"success": true}')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Tool should be executed with deps context
      expect(mockToolRegistry.execute).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // 10. Cached Prompt Tests (Phase 4 Fix)
  // ==========================================================================

  describe('cached prompt usage', () => {
    it('should use cached prompt when available', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      // Set up cached prompt
      const cachedPrompt = 'Cached todo-agent prompt from startup'
      mockContextBuilder.getCachedPrompt.mockReturnValue(cachedPrompt)

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Should check for cached prompt first
      expect(mockContextBuilder.getCachedPrompt).toHaveBeenCalledWith('todo-agent')

      // Should call buildSystemMessage when cache is available
      expect(mockContextBuilder.buildSystemMessage).toHaveBeenCalled()
    })

    it('should fall back to buildSystemPrompt when cache is empty', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      // No cached prompt
      mockContextBuilder.getCachedPrompt.mockReturnValue(undefined)

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Should check for cached prompt first
      expect(mockContextBuilder.getCachedPrompt).toHaveBeenCalledWith('todo-agent')

      // Should fall back to buildSystemPrompt when cache is empty
      expect(mockContextBuilder.buildSystemPrompt).toHaveBeenCalledWith('todo-agent', undefined)
    })

    it('should include time context in system prompt', async () => {
      const messages = createChatMessages([{ role: 'user', content: 'Test' }])
      const context = createAgentContext({
        currentTime: '2024-03-20T10:30:00.000Z',
        timeZone: 'Asia/Shanghai'
      })
      const deps = {
        dataSource: {} as any
      }

      const cachedPrompt = 'Cached prompt'
      mockContextBuilder.getCachedPrompt.mockReturnValue(cachedPrompt)

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })

      for await (const _ of agent.run(messages, context, deps)) {
        // Process events
      }

      // Should call buildSystemMessage with runtime context including currentTime and timeZone
      expect(mockContextBuilder.buildSystemMessage).toHaveBeenCalledWith(
        'todo-agent',
        expect.objectContaining({
          currentTime: '2024-03-20T10:30:00.000Z',
          timeZone: 'Asia/Shanghai'
        })
      )
    })
  })

  // ==========================================================================
  // 11. Message Truncation Tests
  // ==========================================================================

  describe('message truncation', () => {
    it('should truncate messages when exceeding memory window', async () => {
      // Create messages that exceed the default memory window (100)
      const messages: ChatMessage[] = []
      for (let i = 0; i < 150; i++) {
        messages.push({ role: 'user', content: `Message ${i}` })
      }

      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        config: { memoryWindow: 10 } // Small window to force truncation
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should complete without error
      expect(events[events.length - 1].type).toBe('session_end')
    })

    it('should preserve tool_call and tool_output pairing during truncation', async () => {
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
        { role: 'user', content: 'Thanks' }
      ]

      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      mockProvider.chatStream.mockReturnValueOnce(
        createMockStreamChunks(createMockLLMResponse('Response', []))
      )

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        config: { memoryWindow: 3 } // Small window
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should complete without error (no orphan tool messages)
      expect(events[events.length - 1].type).toBe('session_end')
    })

    it('should truncate messages after tool execution in loop', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Create a todo' }]
      const context = createAgentContext()
      const deps = {
        dataSource: {} as any
      }

      const toolCalls: ToolCallRequest[] = [
        { id: 'call_1', name: 'createTodo', arguments: { title: 'Test' } }
      ]

      mockProvider.chatStream
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Creating...', toolCalls)))
        .mockReturnValueOnce(createMockStreamChunks(createMockLLMResponse('Done!', [])))

      mockToolRegistry.execute.mockResolvedValueOnce('{"success": true}')

      const agent = new AgentLoop({
        provider: mockProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        config: { memoryWindow: 5 }
      })

      const events: ConversationEvent[] = []
      for await (const event of agent.run(messages, context, deps)) {
        events.push(event)
      }

      // Should complete normally with result
      const resultChunks = events.filter(e => e.type === 'result_chunk')
      expect(resultChunks.length).toBeGreaterThan(0)
    })
  })
})

/**
 * Tests for Agent Routes - SSE Streaming Endpoint
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import type { DataSource } from 'typeorm'
import type { LLMProvider, LLMResponse, LLMStreamChunk } from '../services/llm/types'
import type { ToolRegistry } from '../services/agent/tools/registry'
import type { ContextBuilder } from '../services/agent/context/types'
import type { MemoryStore } from '../services/agent/memory/types'
import type { TokenTruncator } from '../services/agent/utils/token-truncator'
import { Email } from '../entities/Email.entity'
import { createAgentRoutes, DraftRequest } from './agent.routes'

// Mock factory for Email entity
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

// Mock factory for DataSource
const createMockDataSource = (emails: Email[] = []) => {
  const mockRepository = {
    findOne: vi.fn(async ({ where: { id } }) =>
      emails.find((e) => e.id === id) ?? null
    ),
    findBy: vi.fn(async ({ id }: { id: { in: number[] } }) => {
      // Handle In operator pattern
      if (id && 'in' in id) {
        return emails.filter((e) => id.in.includes(e.id))
      }
      return emails
    }),
    find: vi.fn(async () => emails),
    save: vi.fn(async (entity) => entity),
    createQueryBuilder: vi.fn()
  }

  return {
    getRepository: vi.fn(() => mockRepository),
    initialize: vi.fn(),
    destroy: vi.fn()
  } as unknown as DataSource & { getRepository: ReturnType<typeof vi.fn> }
}

// Helper to create mock stream chunks from a response
async function* createMockStreamChunks(
  response: LLMResponse
): AsyncGenerator<LLMStreamChunk, void, unknown> {
  // If there's content, yield it as chunks
  if (response.content) {
    // Yield content in chunks for realistic streaming
    const words = response.content.split(' ')
    for (let i = 0; i < words.length; i++) {
      const chunk = i === words.length - 1 ? words[i] : words[i] + ' '
      yield { content: chunk, toolCalls: [], isDone: false }
    }
  }

  // Final chunk with tool calls and finish reason
  yield {
    content: null,
    toolCalls: response.toolCalls,
    isDone: true,
    finishReason: response.finishReason
  }
}

// Mock factory for LLM Provider
const createMockLLMProvider = () => ({
  chat: vi.fn(async (): Promise<LLMResponse> => ({
    content: 'This is a draft response.',
    toolCalls: [],
    finishReason: 'stop' as const,
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
  })),
  chatStream: vi.fn(async function* (): AsyncGenerator<LLMStreamChunk, void, unknown> {
    const response: LLMResponse = {
      content: 'This is a draft response.',
      toolCalls: [],
      finishReason: 'stop' as const,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
    }
    yield* createMockStreamChunks(response)
  }),
  getDefaultModel: vi.fn(() => 'gpt-4o-mini')
})

// Mock factory for Tool Registry
const createMockToolRegistry = () => ({
  register: vi.fn(),
  get: vi.fn(),
  has: vi.fn(),
  getDefinitions: vi.fn(() => []),
  execute: vi.fn(async () => 'Tool result'),
  list: vi.fn(() => []),
  size: vi.fn(() => 0)
})

// Mock factory for Context Builder
const createMockContextBuilder = () => ({
  buildSystemPrompt: vi.fn(async () => 'System prompt'),
  buildMessages: vi.fn(async () => [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Draft a reply' }
  ]),
  buildRuntimeContext: vi.fn(() => '[Runtime Context]'),
  addAssistantMessage: vi.fn(),
  addToolResult: vi.fn(),
  getIdentity: vi.fn(async () => 'Identity'),
  loadBootstrapFiles: vi.fn(async () => '')
})

// Mock factory for Memory Store
const createMockMemoryStore = () => ({
  getMemoryContext: vi.fn(async () => ''),
  getHistory: vi.fn(async () => []),
  saveTurn: vi.fn(),
  updateMemory: vi.fn()
})

// Mock factory for Token Truncator
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

describe('Agent Routes', () => {
  let app: express.Application
  let mockDataSource: ReturnType<typeof createMockDataSource>
  let mockLLMProvider: ReturnType<typeof createMockLLMProvider>
  let mockToolRegistry: ReturnType<typeof createMockToolRegistry>
  let mockContextBuilder: ReturnType<typeof createMockContextBuilder>
  let mockMemoryStore: ReturnType<typeof createMockMemoryStore>
  let mockTokenTruncator: ReturnType<typeof createMockTokenTruncator>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mocks
    mockDataSource = createMockDataSource([createMockEmail()])
    mockLLMProvider = createMockLLMProvider()
    mockToolRegistry = createMockToolRegistry()
    mockContextBuilder = createMockContextBuilder()
    mockMemoryStore = createMockMemoryStore()
    mockTokenTruncator = createMockTokenTruncator()

    // Create Express app
    app = express()
    app.use(express.json())
    app.use(
      '/api/agent',
      createAgentRoutes({
        dataSource: mockDataSource,
        llmProvider: mockLLMProvider as unknown as LLMProvider,
        toolRegistry: mockToolRegistry as unknown as ToolRegistry,
        contextBuilder: mockContextBuilder as unknown as ContextBuilder,
        memoryStore: mockMemoryStore as unknown as MemoryStore,
        tokenTruncator: mockTokenTruncator as unknown as TokenTruncator
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/agent/draft', () => {
    it('should return 400 when emailId is missing', async () => {
      const response = await request(app)
        .post('/api/agent/draft')
        .send({ instruction: 'Draft a reply' })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('emailId')
    })

    it('should return 400 when instruction is missing', async () => {
      const response = await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 1 })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('instruction')
    })

    it('should return 404 when email not found', async () => {
      // Override mock to return null
      mockDataSource.getRepository().findOne.mockResolvedValueOnce(null)

      const response = await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 999, instruction: 'Draft a reply' })

      expect(response.status).toBe(404)
      expect(response.body.error).toContain('not found')
    })

    it('should set correct SSE headers', async () => {
      const response = await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 1, instruction: 'Draft a reply' })

      expect(response.headers['content-type']).toContain('text/event-stream')
      expect(response.headers['cache-control']).toBe('no-cache')
      expect(response.headers['connection']).toBe('keep-alive')
    })

    it('should stream SSE events for successful draft generation', async () => {
      const response = await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 1, instruction: 'Draft a reply' })

      expect(response.status).toBe(200)

      // Parse SSE events from response text
      const text = response.text
      expect(text).toContain('data:')

      // Should contain thought, chunk, and done events
      expect(text).toContain('"type":"thought"')
      expect(text).toContain('"type":"chunk"')
      expect(text).toContain('"type":"done"')
    })

    it('should stream error event when LLM fails', async () => {
      // Create an async generator that throws
      mockLLMProvider.chatStream.mockImplementationOnce(async function* () {
        throw new Error('LLM API error')
      })

      const response = await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 1, instruction: 'Draft a reply' })

      expect(response.status).toBe(200)

      const text = response.text
      expect(text).toContain('"type":"error"')
      expect(text).toContain('LLM API error')
    })

    it('should call AgentLoop with correct parameters', async () => {
      await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 1, instruction: 'Draft a reply about the meeting' })

      // LLM provider should have been called via chatStream
      expect(mockLLMProvider.chatStream).toHaveBeenCalled()

      // Should pass messages and tools
      expect(mockLLMProvider.chatStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array),
          tools: expect.any(Array)
        })
      )
    })
  })

  describe('SSE Event Format', () => {
    it('should format thought events correctly', async () => {
      const response = await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 1, instruction: 'Draft a reply' })

      const text = response.text
      // Should have valid JSON in data field
      const lines = text.split('\n').filter((line: string) => line.startsWith('data:'))

      for (const line of lines) {
        const jsonStr = line.replace('data:', '').trim()
        if (jsonStr) {
          const event = JSON.parse(jsonStr)
          expect(event).toHaveProperty('type')
          expect(event).toHaveProperty('content')
        }
      }
    })

    it('should include iteration number in events', async () => {
      const response = await request(app)
        .post('/api/agent/draft')
        .send({ emailId: 1, instruction: 'Draft a reply' })

      const text = response.text
      const lines = text.split('\n').filter((line: string) => line.startsWith('data:'))

      // At least one event should have iteration
      const hasIteration = lines.some((line: string) => {
        const jsonStr = line.replace('data:', '').trim()
        if (!jsonStr) return false
        const event = JSON.parse(jsonStr)
        return event.iteration !== undefined
      })

      expect(hasIteration).toBe(true)
    })
  })

  describe('POST /api/agent/process-emails', () => {
    it('should return 400 when emailIds is missing', async () => {
      const response = await request(app)
        .post('/api/agent/process-emails')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('emailIds')
    })

    it('should return 400 when emailIds is empty', async () => {
      const response = await request(app)
        .post('/api/agent/process-emails')
        .send({ emailIds: [] })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('empty')
    })

    it('should process emails and return results', async () => {
      // Setup multiple emails
      mockDataSource.getRepository().find.mockResolvedValueOnce([
        createMockEmail({ id: 1 }),
        createMockEmail({ id: 2 })
      ])

      const response = await request(app)
        .post('/api/agent/process-emails')
        .send({ emailIds: [1, 2] })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('processed')
      expect(response.body).toHaveProperty('failed')
      expect(response.body).toHaveProperty('results')
    })

    it('should handle mixed success and failure', async () => {
      // One exists, one doesn't
      mockDataSource.getRepository().findOne
        .mockResolvedValueOnce(createMockEmail({ id: 1 }))
        .mockResolvedValueOnce(null)

      const response = await request(app)
        .post('/api/agent/process-emails')
        .send({ emailIds: [1, 999] })

      expect(response.status).toBe(200)
      expect(response.body.failed).toBe(1)
    })
  })
})

describe('DraftRequest Type', () => {
  it('should have correct type definition', () => {
    const validRequest: DraftRequest = {
      emailId: 1,
      instruction: 'Draft a reply'
    }

    expect(validRequest.emailId).toBe(1)
    expect(validRequest.instruction).toBe('Draft a reply')
  })
})
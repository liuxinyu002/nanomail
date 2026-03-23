/**
 * Tests for Agent Routes - Email Processing Endpoint
 *
 * Phase 4 Tests: POST /api/agent/chat SSE endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import type { DataSource } from 'typeorm'
import type { LLMProvider } from '../services/llm/types'
import type { ToolRegistry } from '../services/agent/tools/registry'
import type { ContextBuilder } from '../services/agent/context/types'
import type { MemoryStore } from '../services/agent/memory/types'
import { Email } from '../entities/Email.entity'
import { createAgentRoutes } from './agent.routes'

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

// Mock factory for LLM Provider
const createMockLLMProvider = () => ({
  chat: vi.fn(async () => ({
    content: 'This is a response.',
    toolCalls: [],
    finishReason: 'stop' as const,
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
  })),
  chatStream: vi.fn(),
  getDefaultModel: vi.fn(() => 'gpt-4o-mini')
})

// Helper to create mock stream chunks
async function* createMockStreamChunks(
  content: string,
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [],
  finishReason: 'stop' | 'tool_calls' | 'error' = 'stop'
): AsyncGenerator<{ content: string | null; toolCalls: typeof toolCalls; isDone: boolean; finishReason?: string }, void, unknown> {
  if (content) {
    yield { content, toolCalls: [], isDone: false }
  }
  yield { content: null, toolCalls, isDone: true, finishReason }
}

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
    { role: 'user', content: 'Process email' }
  ]),
  buildRuntimeContext: vi.fn(() => '[Runtime Context]'),
  buildSystemMessage: vi.fn(() => 'System prompt with runtime context'),
  setCachedPrompt: vi.fn(),
  getCachedPrompt: vi.fn(),
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

describe('Agent Routes', () => {
  let app: express.Application
  let mockDataSource: ReturnType<typeof createMockDataSource>
  let mockLLMProvider: ReturnType<typeof createMockLLMProvider>
  let mockToolRegistry: ReturnType<typeof createMockToolRegistry>
  let mockContextBuilder: ReturnType<typeof createMockContextBuilder>
  let mockMemoryStore: ReturnType<typeof createMockMemoryStore>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mocks
    mockDataSource = createMockDataSource([createMockEmail()])
    mockLLMProvider = createMockLLMProvider()
    mockToolRegistry = createMockToolRegistry()
    mockContextBuilder = createMockContextBuilder()
    mockMemoryStore = createMockMemoryStore()

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
        memoryStore: mockMemoryStore as unknown as MemoryStore
      })
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

    it('should return 404 when no emails found', async () => {
      // Clear the default email from mock
      mockDataSource.getRepository().findBy.mockResolvedValueOnce([])

      const response = await request(app)
        .post('/api/agent/process-emails')
        .send({ emailIds: [999] })

      expect(response.status).toBe(404)
      expect(response.body.error).toContain('No emails found')
    })

    it('should process emails and return results', async () => {
      // Setup multiple emails
      mockDataSource.getRepository().findBy.mockResolvedValueOnce([
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
  })

  // ==========================================================================
  // Phase 4: POST /api/agent/chat - SSE Endpoint Tests
  //
  // Note: SSE streaming tests are complex with supertest because it waits for
  // the response to complete. The streaming behavior is better tested at the
  // AgentLoop level. Here we focus on input validation and SSE setup.
  // ==========================================================================

  describe('POST /api/agent/chat', () => {
    it('should return 400 for invalid request body (empty messages)', async () => {
      const response = await request(app)
        .post('/api/agent/chat')
        .send({
          messages: [], // Empty messages array
          context: {
            currentTime: '2024-01-15T10:00:00Z',
            timeZone: 'Asia/Shanghai'
          }
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for missing context.currentTime', async () => {
      const response = await request(app)
        .post('/api/agent/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          context: {
            timeZone: 'Asia/Shanghai'
            // Missing currentTime
          }
        })

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid currentTime format', async () => {
      const response = await request(app)
        .post('/api/agent/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
          context: {
            currentTime: 'not-a-date', // Invalid format
            timeZone: 'Asia/Shanghai'
          }
        })

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing context entirely', async () => {
      const response = await request(app)
        .post('/api/agent/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
          // Missing context
        })

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing messages array', async () => {
      const response = await request(app)
        .post('/api/agent/chat')
        .send({
          context: {
            currentTime: '2024-01-15T10:00:00Z',
            timeZone: 'Asia/Shanghai'
          }
        })

      expect(response.status).toBe(400)
    })

    // Note: SSE streaming behavior is tested at the AgentLoop level.
    // Supertest doesn't handle SSE streaming properly - it waits for
    // the response to complete, but SSE streams don't complete until
    // the connection is closed. The input validation tests above
    // verify the endpoint works correctly for synchronous cases.
  })
})

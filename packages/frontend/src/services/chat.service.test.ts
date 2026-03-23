import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatService, type ConversationEvent, type ChatServiceRequest } from './chat.service'
import type { ChatMessage, ChatContext } from '@nanomail/shared'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock ReadableStream for SSE testing
function createMockReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(new TextEncoder().encode(chunks[index]))
        index++
      } else {
        controller.close()
      }
    },
  })
}

// Helper to create SSE event strings
function sseEvent(eventType: string, data: object): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
}

describe('ChatService', () => {
  const validContext: ChatContext = {
    currentTime: '2024-03-20T10:30:00.000Z',
    timeZone: 'Asia/Shanghai',
  }

  const validMessages: ChatMessage[] = [
    { role: 'user', content: 'Hello' },
  ]

  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('streamChat', () => {
    it('should make POST request to /api/agent/chat', async () => {
      const events: ConversationEvent[] = []
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([]),
      })

      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(mockFetch).toHaveBeenCalledWith('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true }),
        signal: undefined,
      })
    })

    it('should include stream: true in request body', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
        stream: false, // Explicitly set to false, but should be overridden
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([]),
      })

      for await (const _ of ChatService.streamChat(request)) {
        // consume iterator
      }

      expect(mockFetch).toHaveBeenCalledWith('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true }),
        signal: undefined,
      })
    })

    it('should pass AbortSignal to fetch', async () => {
      const controller = new AbortController()
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([]),
      })

      for await (const _ of ChatService.streamChat(request, controller.signal)) {
        // consume iterator
      }

      expect(mockFetch).toHaveBeenCalledWith('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
        signal: controller.signal,
      })
    })

    it('should yield session_start event', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = sseEvent('session_start', { type: 'session_start', sessionId: 'session-123' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'session_start',
        sessionId: 'session-123',
      })
    })

    it('should yield thinking event', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = sseEvent('thinking', { type: 'thinking', content: 'Processing your request...' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'thinking',
        content: 'Processing your request...',
      })
    })

    it('should yield tool_call_start event', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = sseEvent('tool_call_start', {
        type: 'tool_call_start',
        toolCallId: 'call-123',
        toolName: 'create_todo',
        input: { description: 'Test todo' },
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'tool_call_start',
        toolCallId: 'call-123',
        toolName: 'create_todo',
        input: { description: 'Test todo' },
      })
    })

    it('should yield tool_call_end event', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = sseEvent('tool_call_end', {
        type: 'tool_call_end',
        toolCallId: 'call-123',
        output: { success: true },
        message: 'Todo created successfully',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'tool_call_end',
        toolCallId: 'call-123',
        output: { success: true },
        message: 'Todo created successfully',
      })
    })

    it('should yield result_chunk event', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = sseEvent('result_chunk', { type: 'result_chunk', content: 'Hello' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'result_chunk',
        content: 'Hello',
      })
    })

    it('should yield session_end event', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = sseEvent('session_end', { type: 'session_end' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({ type: 'session_end' })
    })

    it('should yield error event', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = sseEvent('error', { type: 'error', error: 'Something went wrong' })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'error',
        error: 'Something went wrong',
      })
    })

    it('should yield multiple events in order', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      const sseData = [
        sseEvent('session_start', { type: 'session_start', sessionId: 'session-123' }),
        sseEvent('thinking', { type: 'thinking', content: 'Thinking...' }),
        sseEvent('result_chunk', { type: 'result_chunk', content: 'Hello' }),
        sseEvent('result_chunk', { type: 'result_chunk', content: ' world' }),
        sseEvent('session_end', { type: 'session_end' }),
      ].join('')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(5)
      expect(events[0].type).toBe('session_start')
      expect(events[1].type).toBe('thinking')
      expect(events[2].type).toBe('result_chunk')
      expect(events[3].type).toBe('result_chunk')
      expect(events[4].type).toBe('session_end')
    })

    it('should handle chunked SSE data (split across multiple reads)', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      // Split one event across two chunks
      const chunk1 = 'event: result_chunk\ndata: {"type":"result_'
      const chunk2 = 'chunk","content":"Hello"}\n\n'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([chunk1, chunk2]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(1)
      expect(events[0]).toEqual({
        type: 'result_chunk',
        content: 'Hello',
      })
    })

    it('should throw error when fetch fails with non-ok status', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const generator = ChatService.streamChat(request)

      await expect(async () => {
        for await (const _ of generator) {
          // consume
        }
      }).rejects.toThrow('Chat request failed: 500 Internal Server Error')
    })

    it('should throw error when response body is null', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      })

      const generator = ChatService.streamChat(request)

      await expect(async () => {
        for await (const _ of generator) {
          // consume
        }
      }).rejects.toThrow('Response body is null')
    })

    it('should handle abort signal correctly', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }
      const controller = new AbortController()

      // Mock fetch to throw AbortError when aborted
      mockFetch.mockImplementation(async () => {
        // Simulate delay then abort
        await new Promise(resolve => setTimeout(resolve, 10))
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        throw error
      })

      const generator = ChatService.streamChat(request, controller.signal)

      await expect(async () => {
        for await (const _ of generator) {
          // consume
        }
      }).rejects.toThrow('The operation was aborted')
    })

    it('should skip malformed SSE events gracefully', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      // Mix valid and invalid events
      const sseData = [
        sseEvent('result_chunk', { type: 'result_chunk', content: 'Valid' }),
        'event: invalid\ndata: not-json\n\n', // Invalid JSON
        sseEvent('session_end', { type: 'session_end' }),
      ].join('')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream([sseData]),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      // Should still yield valid events, skip the malformed one
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events[0].type).toBe('result_chunk')
    })

    it('should handle empty response body', async () => {
      const request: ChatServiceRequest = {
        messages: validMessages,
        context: validContext,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockReadableStream(['']),
      })

      const events: ConversationEvent[] = []
      for await (const event of ChatService.streamChat(request)) {
        events.push(event)
      }

      expect(events).toHaveLength(0)
    })
  })
})

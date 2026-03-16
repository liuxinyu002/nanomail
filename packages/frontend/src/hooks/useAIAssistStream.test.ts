/**
 * Tests for useAIAssistStream hook
 *
 * Tests SSE (Server-Sent Events) streaming with:
 * - Callback-based API (onChunk, onDone, onError, onThought)
 * - Cancellable requests via AbortController
 * - Status tracking (idle, thinking, drafting, done, error)
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAIAssistStream } from './useAIAssistStream'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create a ReadableStream that simulates SSE responses
function createSSEStream(events: Array<{ type: string; content: string; toolName?: string }>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  // Each event must be followed by double newline, and stream should end with double newline
  const eventStrings = events.map(
    (e) => `data: ${JSON.stringify(e)}\n\n`
  )
  const fullContent = eventStrings.join('')

  let sent = false
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        controller.enqueue(encoder.encode(fullContent))
        sent = true
      }
      controller.close()
    },
  })
}

// Helper to create an async SSE stream that can be controlled
function createAsyncSSEStream(): {
  stream: ReadableStream<Uint8Array>
  enqueue: (event: { type: string; content: string }) => void
  close: () => void
} {
  const encoder = new TextEncoder()
  const queue: Uint8Array[] = []
  let resolvePull: (() => void) | null = null
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (queue.length > 0) {
        controller.enqueue(queue.shift()!)
        return Promise.resolve()
      }
      if (closed) {
        controller.close()
        return Promise.resolve()
      }
      return new Promise((resolve) => {
        resolvePull = resolve
      })
    },
  })

  const enqueue = (event: { type: string; content: string }) => {
    const eventStr = `data: ${JSON.stringify(event)}\n\n`
    queue.push(encoder.encode(eventStr))
    if (resolvePull) {
      resolvePull()
      resolvePull = null
    }
  }

  const close = () => {
    closed = true
    if (resolvePull) {
      resolvePull()
      resolvePull = null
    }
  }

  return { stream, enqueue, close }
}

describe('useAIAssistStream', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const onChunk = vi.fn()
      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      expect(result.current.thoughts).toEqual([])
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.status).toBe('idle')
      expect(result.current.error).toBeNull()
    })
  })

  describe('start() method', () => {
    it('should call fetch with correct endpoint and method', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 42, instruction: 'Reply to this email', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/agent/draft',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
            body: JSON.stringify({ emailId: 42, instruction: 'Reply to this email' }),
          })
        )
      })
    })

    it('should not fetch when enabled is false', async () => {
      const onChunk = vi.fn()
      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, enabled: false })
      )

      act(() => {
        result.current.start()
      })

      // Wait a bit to ensure no fetch is called
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should transition status to thinking when start is called', async () => {
      const onChunk = vi.fn()
      const { stream } = createAsyncSSEStream()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('thinking')
      })
    })

    it('should set isStreaming to true when start is called', async () => {
      const onChunk = vi.fn()
      const { stream } = createAsyncSSEStream()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true)
      })
    })
  })

  describe('onChunk callback', () => {
    it('should call onChunk callback when receiving chunk events', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'chunk', content: 'Hello ' },
          { type: 'chunk', content: 'World!' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onChunk).toHaveBeenCalledTimes(2)
      })
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello ')
      expect(onChunk).toHaveBeenNthCalledWith(2, 'World!')
    })

    it('should transition status to drafting when first chunk is received', async () => {
      const onChunk = vi.fn()
      const { stream, enqueue, close } = createAsyncSSEStream()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      // Wait for thinking status first
      await waitFor(() => {
        expect(result.current.status).toBe('thinking')
      })

      // Send a chunk event - this should transition to drafting
      enqueue({ type: 'chunk', content: 'Hello' })

      await waitFor(() => {
        expect(result.current.status).toBe('drafting')
      })

      // Clean up
      close()
    })
  })

  describe('onDone callback', () => {
    it('should call onDone callback when done event is received', async () => {
      const onChunk = vi.fn()
      const onDone = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'chunk', content: 'Done content' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onDone })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onDone).toHaveBeenCalledTimes(1)
      })
    })

    it('should set status to done when done event is received', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'chunk', content: 'Content' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('onError callback', () => {
    it('should call onError callback when error event is received', async () => {
      const onChunk = vi.fn()
      const onError = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'error', content: 'Something went wrong' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onError })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Something went wrong')
      })
    })

    it('should set status to error when error event is received', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'error', content: 'Error occurred' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('error')
      })
      expect(result.current.error).toBe('Error occurred')
      expect(result.current.isStreaming).toBe(false)
    })

    it('should call onError callback on HTTP error', async () => {
      const onChunk = vi.fn()
      const onError = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onError })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
      expect(result.current.status).toBe('error')
    })

    it('should call onError callback on network error', async () => {
      const onChunk = vi.fn()
      const onError = vi.fn()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onError })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error')
      })
      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('onThought callback', () => {
    it('should call onThought callback when thought event is received', async () => {
      const onChunk = vi.fn()
      const onThought = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'thought', content: 'Thinking about the reply...' },
          { type: 'chunk', content: 'Hello' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onThought })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onThought).toHaveBeenCalledWith('Thinking about the reply...')
      })
    })

    it('should aggregate thoughts in the thoughts array', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'thought', content: 'First thought' },
          { type: 'thought', content: 'Second thought' },
          { type: 'chunk', content: 'Content' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.thoughts).toEqual(['First thought', 'Second thought'])
      })
    })
  })

  describe('cancel() method', () => {
    it('should abort request when cancel is called', async () => {
      const onChunk = vi.fn()
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

      const { stream } = createAsyncSSEStream()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true)
      })

      act(() => {
        result.current.cancel()
      })

      expect(abortSpy).toHaveBeenCalled()
      expect(result.current.status).toBe('idle')

      abortSpy.mockRestore()
    })

    it('should set status to idle when cancel is called', async () => {
      const onChunk = vi.fn()
      const { stream } = createAsyncSSEStream()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('thinking')
      })

      act(() => {
        result.current.cancel()
      })

      expect(result.current.status).toBe('idle')
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('reset() method', () => {
    it('should reset state to initial values', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'thought', content: 'A thought' },
          { type: 'chunk', content: 'Content' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })

      expect(result.current.thoughts).toHaveLength(1)

      act(() => {
        result.current.reset()
      })

      expect(result.current.thoughts).toEqual([])
      expect(result.current.status).toBe('idle')
      expect(result.current.error).toBeNull()
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('Cleanup on unmount', () => {
    it('should abort request when component unmounts', async () => {
      const onChunk = vi.fn()
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

      const { stream } = createAsyncSSEStream()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      })

      const { result, unmount } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true)
      })

      unmount()

      // Cleanup should have been called
      expect(abortSpy).toHaveBeenCalled()

      abortSpy.mockRestore()
    })
  })

  describe('Multiple chunk events', () => {
    it('should handle multiple chunk events in sequence', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'chunk', content: 'Hello, ' },
          { type: 'chunk', content: 'this is ' },
          { type: 'chunk', content: 'a test.' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })

      expect(onChunk).toHaveBeenCalledTimes(3)
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello, ')
      expect(onChunk).toHaveBeenNthCalledWith(2, 'this is ')
      expect(onChunk).toHaveBeenNthCalledWith(3, 'a test.')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty response body', async () => {
      const onChunk = vi.fn()
      const onError = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onError })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('No response body')
      })
      expect(result.current.status).toBe('error')
    })

    it('should handle malformed JSON in SSE event', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream<Uint8Array>({
          pull(controller) {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode('data: not-valid-json\n\n'))
            controller.close()
          },
        }),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      // Should complete without crashing - malformed events should be skipped
      await waitFor(() => {
        expect(result.current.status).toBe('thinking')
      })
    })

    it('should handle response without ok status', async () => {
      const onChunk = vi.fn()
      const onError = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onError })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
      expect(result.current.status).toBe('error')
    })

    it('should handle 401 unauthorized error', async () => {
      const onChunk = vi.fn()
      const onError = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk, onError })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('HTTP 401: Unauthorized')
      })
    })
  })

  describe('Status transitions', () => {
    it('should follow correct status sequence: idle -> thinking -> drafting -> done', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'thought', content: 'Thinking...' },
          { type: 'chunk', content: 'Content' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      // Initially idle
      expect(result.current.status).toBe('idle')

      act(() => {
        result.current.start()
      })

      // After start: thinking (verified by checking isStreaming)
      await waitFor(() => {
        expect(result.current.isStreaming).toBe(true)
      })

      // After all events processed: done
      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })

      // Verify callbacks were called in order
      expect(onChunk).toHaveBeenCalledWith('Content')
      expect(result.current.thoughts).toContain('Thinking...')
    })

    it('should transition to error status on failure', async () => {
      const onChunk = vi.fn()
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'))

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      expect(result.current.status).toBe('idle')

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('error')
      })
    })
  })

  describe('Action and observation events', () => {
    it('should handle action events without crashing', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'action', content: 'Fetching emails' },
          { type: 'chunk', content: 'Content' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })
    })

    it('should handle observation events without crashing', async () => {
      const onChunk = vi.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createSSEStream([
          { type: 'observation', content: 'Found 5 emails' },
          { type: 'chunk', content: 'Content' },
          { type: 'done', content: '' },
        ]),
      })

      const { result } = renderHook(() =>
        useAIAssistStream({ emailId: 1, instruction: 'test', onChunk })
      )

      act(() => {
        result.current.start()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('done')
      })
    })
  })
})
/**
 * React hook for AI assist reply streaming
 *
 * Uses SSE (Server-Sent Events) with callback-based pattern for better
 * reusability and decoupling from UI components.
 *
 * Features:
 * - Cancellable requests via AbortController
 * - Status tracking (idle, thinking, drafting, done, error)
 * - Thought aggregation for optional UI display
 * - Callback-based API for flexibility
 * - Proper cleanup on unmount
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { createParser } from 'eventsource-parser'

/**
 * SSE event types from the AI assist backend
 */
export type SSEEventType = 'thought' | 'action' | 'observation' | 'chunk' | 'done' | 'error'

/**
 * SSE event structure from the backend
 */
export interface SSEEvent {
  type: SSEEventType
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
  iteration?: number
}

/**
 * Options for the useAIAssistStream hook
 */
export interface UseAIAssistStreamOptions {
  /** Email ID to generate reply for */
  emailId: number
  /** Instruction for AI to generate reply */
  instruction: string
  /** Called when a content chunk is received */
  onChunk: (chunk: string) => void
  /** Called when streaming completes successfully */
  onDone?: () => void
  /** Called when an error occurs */
  onError?: (error: string) => void
  /** Called when a thought event is received */
  onThought?: (thought: string) => void
  /** Whether streaming is enabled (default: true) */
  enabled?: boolean
}

/**
 * Status of the streaming process
 */
export type StreamingStatus = 'idle' | 'thinking' | 'drafting' | 'done' | 'error'

/**
 * Return type for useAIAssistStream hook
 */
export interface UseAIAssistStreamReturn {
  /** Aggregated thoughts from the AI */
  thoughts: string[]
  /** Whether a stream is currently active */
  isStreaming: boolean
  /** Current status of the streaming process */
  status: StreamingStatus
  /** Error message if status is 'error' */
  error: string | null
  /** Start the streaming process */
  start: () => void
  /** Cancel the current stream */
  cancel: () => void
  /** Reset state to initial values */
  reset: () => void
}

/**
 * API base URL - can be configured via environment variable
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * React hook for AI assist streaming
 *
 * Uses eventsource-parser for robust SSE parsing that handles:
 * - Chunk boundaries (messages split across multiple chunks)
 * - Reconnection scenarios
 * - Partial messages
 *
 * @example
 * ```tsx
 * const editorRef = useRef<TipTapEditorHandle>(null)
 *
 * const { isStreaming, status, start, cancel } = useAIAssistStream({
 *   emailId,
 *   onChunk: (chunk) => {
 *     editorRef.current?.appendContent(chunk)
 *   },
 *   onDone: () => {
 *     setEditorDisabled(false)
 *   },
 *   onError: (error) => {
 *     toast.error(error)
 *   }
 * })
 * ```
 */
export function useAIAssistStream(
  options: UseAIAssistStreamOptions
): UseAIAssistStreamReturn {
  const {
    emailId,
    instruction,
    onChunk,
    onDone,
    onError,
    onThought,
    enabled = true,
  } = options

  const [thoughts, setThoughts] = useState<string[]>([])
  const [status, setStatus] = useState<StreamingStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const start = useCallback(async () => {
    if (!enabled) return

    // Reset state
    setThoughts([])
    setError(null)
    setStatus('thinking')

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(`${API_BASE_URL}/agent/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, instruction }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Use eventsource-parser for robust SSE parsing
      const parser = createParser({
        onEvent: (event) => {
          try {
            const sseEvent = JSON.parse(event.data) as SSEEvent

            switch (sseEvent.type) {
              case 'thought':
                setThoughts((prev) => [...prev, sseEvent.content])
                onThought?.(sseEvent.content)
                break
              case 'action':
              case 'observation':
                // These events are logged but don't trigger callbacks
                // Could be extended in the future for more granular control
                break
              case 'chunk':
                setStatus('drafting')
                onChunk(sseEvent.content)
                break
              case 'done':
                setStatus('done')
                onDone?.()
                break
              case 'error':
                setStatus('error')
                setError(sseEvent.content)
                onError?.(sseEvent.content)
                break
            }
          } catch {
            // Skip malformed JSON - silently ignore
            // Note: In production, consider integrating with error tracking service
          }
        },
        onError: () => {
          // SSE parser error - the stream will handle reconnection if needed
        },
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Feed raw bytes to parser - it handles chunk boundaries
        parser.feed(decoder.decode(value, { stream: true }))
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelled by user - reset to idle
        setStatus('idle')
      } else {
        setStatus('error')
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMsg)
        onError?.(errorMsg)
      }
    }
  }, [emailId, instruction, enabled, onChunk, onDone, onError, onThought])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setStatus('idle')
  }, [])

  const reset = useCallback(() => {
    setThoughts([])
    setError(null)
    setStatus('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    thoughts,
    isStreaming: status === 'thinking' || status === 'drafting',
    status,
    error,
    start,
    cancel,
    reset,
  }
}

export default useAIAssistStream
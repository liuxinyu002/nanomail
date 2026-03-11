/**
 * React hook for SSE (Server-Sent Events) agent draft generation
 *
 * Uses eventsource-parser for robust SSE parsing.
 * Handles chunk boundaries, reconnection, and partial messages.
 *
 * Reference: Phase 3.4 plan - Frontend SSE client
 */

import { useState, useCallback } from 'react'

/**
 * SSE event types from the agent loop
 */
export type SSEEventType = 'thought' | 'action' | 'observation' | 'chunk' | 'done' | 'error'

/**
 * SSE event structure
 */
export interface SSEEvent {
  type: SSEEventType
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
  iteration?: number
}

/**
 * Return type for useAgentDraft hook
 */
export interface UseAgentDraftReturn {
  events: SSEEvent[]
  draft: string
  isStreaming: boolean
  error: string | null
  generateDraft: (emailId: number, instruction: string) => Promise<void>
  reset: () => void
}

/**
 * API base URL - can be configured via environment variable
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * React hook for SSE-based draft generation
 *
 * @example
 * ```tsx
 * const { events, draft, isStreaming, generateDraft } = useAgentDraft()
 *
 * const handleGenerate = () => {
 *   generateDraft(1, 'Draft a reply acknowledging the meeting')
 * }
 *
 * return (
 *   <div>
 *     <button onClick={handleGenerate} disabled={isStreaming}>
 *       Generate Draft
 *     </button>
 *     <div>{draft}</div>
 *     {events.map((e, i) => (
 *       <div key={i}>{e.type}: {e.content}</div>
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useAgentDraft(): UseAgentDraftReturn {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Generate a draft for an email
   */
  const generateDraft = useCallback(async (emailId: number, instruction: string) => {
    // Reset state
    setEvents([])
    setDraft('')
    setError(null)
    setIsStreaming(true)

    try {
      const response = await fetch(`${API_BASE_URL}/agent/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, instruction })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages in buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.slice(5).trim()
              if (!jsonStr) continue

              const sseEvent = JSON.parse(jsonStr) as SSEEvent
              setEvents((prev) => [...prev, sseEvent])

              // Build draft from chunk events
              if (sseEvent.type === 'chunk') {
                setDraft((prev) => prev + sseEvent.content)
              }

              // Handle completion
              if (sseEvent.type === 'done') {
                setIsStreaming(false)
              }

              // Handle errors
              if (sseEvent.type === 'error') {
                setError(sseEvent.content)
                setIsStreaming(false)
              }
            } catch {
              // Skip malformed JSON
              console.warn('Failed to parse SSE event:', line)
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setEvents((prev) => [
        ...prev,
        { type: 'error', content: errorMessage }
      ])
    } finally {
      setIsStreaming(false)
    }
  }, [])

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setEvents([])
    setDraft('')
    setError(null)
    setIsStreaming(false)
  }, [])

  return {
    events,
    draft,
    isStreaming,
    error,
    generateDraft,
    reset
  }
}

/**
 * Hook for process-emails endpoint
 */
export interface ProcessEmailsResult {
  processed: number
  failed: number
  results: Array<{
    emailId: number
    status: 'fulfilled' | 'rejected'
    data?: { id: number; status: string }
    error?: string
  }>
}

export interface UseProcessEmailsReturn {
  isLoading: boolean
  error: string | null
  result: ProcessEmailsResult | null
  processEmails: (emailIds: number[]) => Promise<ProcessEmailsResult | null>
  reset: () => void
}

/**
 * React hook for processing emails via AI pipeline
 */
export function useProcessEmails(): UseProcessEmailsReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProcessEmailsResult | null>(null)

  const processEmails = useCallback(async (emailIds: number[]) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/agent/process-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = (await response.json()) as ProcessEmailsResult
      setResult(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setResult(null)
  }, [])

  return {
    isLoading,
    error,
    result,
    processEmails,
    reset
  }
}

export default useAgentDraft
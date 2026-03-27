import { createParser } from 'eventsource-parser'
import { ChatRequestSchema, type ChatMessage, type ChatContext } from '@nanomail/shared'
import { buildApiUrl } from '@/config/api.config'

/**
 * Chat service request type - wraps messages and context for API calls
 */
export interface ChatServiceRequest {
  messages: ChatMessage[]
  context: ChatContext
  stream?: boolean
}

/**
 * SSE Event Types - must match backend event types
 * Backend format: { type: '...', data: { ... }, sessionId, messageId, timestamp }
 */
export type ConversationEvent =
  | { type: 'session_start'; data: { sessionId: string } }
  | { type: 'thinking'; data: { content: string } }
  | { type: 'tool_call_start'; data: { toolCallId: string; toolName: string; toolInput: Record<string, unknown> } }
  | { type: 'tool_call_end'; data: { toolCallId: string; toolName: string; toolInput: Record<string, unknown>; toolOutput: Record<string, unknown> } }
  | { type: 'result_chunk'; data: { content: string } }
  | { type: 'session_end'; data: null }
  | { type: 'error'; data: { code: string; message: string } }

/**
 * ChatService handles SSE-based chat communication with the backend agent.
 * Uses eventsource-parser to parse Server-Sent Events from the streaming response.
 */
export const ChatService = {
  /**
   * Stream chat messages to the backend and yield events as they arrive.
   *
   * @param request - Chat request containing messages and context
   * @param signal - Optional AbortSignal for cancellation
   * @yields ConversationEvent - Parsed SSE events from the backend
   * @throws Error if the request fails or response body is null
   */
  async *streamChat(
    request: ChatServiceRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ConversationEvent> {
    // Validate request before sending (defense-in-depth)
    const validatedRequest = ChatRequestSchema.parse({ ...request, stream: true })

    const response = await fetch(buildApiUrl('/api/agent/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validatedRequest),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const eventQueue: ConversationEvent[] = []

    // eventsource-parser v3.x uses object with onEvent callback
    const parser = createParser({
      onEvent: (event) => {
        try {
          const data = JSON.parse(event.data) as ConversationEvent
          eventQueue.push(data)
        } catch {
          // Silently ignore unparseable events
        }
      },
    })

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        parser.feed(chunk)

        // Yield all parsed events from the queue
        while (eventQueue.length > 0) {
          const event = eventQueue.shift()
          if (event) {
            yield event
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}

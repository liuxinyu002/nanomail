import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatService, type ConversationEvent, type ChatServiceRequest } from '@/services/chat.service'
import type { ChatMessage, ChatContext } from '@nanomail/shared'

// ============ Types ============

export interface ToolCallStatus {
  id: string
  toolName: string
  status: 'pending' | 'success' | 'error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  message?: string
}

export interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallStatus[]
  timestamp: string
}

export interface ChatState {
  messages: UIMessage[]
  isStreaming: boolean
  error: string | null
}

// ============ Constants ============

const SESSION_STORAGE_KEY = 'nanomail_chat_messages'

// ============ Helper Functions ============

function createUIMessage(role: 'user' | 'assistant', content: string): UIMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Prunes toolCalls by removing large input/output payloads.
 * This prevents QuotaExceededError when saving to sessionStorage.
 * Tool call metadata (id, toolName, status, message) is preserved for UI display.
 */
function pruneToolCalls(toolCalls: ToolCallStatus[]): ToolCallStatus[] {
  return toolCalls.map(tc => ({
    id: tc.id,
    toolName: tc.toolName,
    status: tc.status,
    message: tc.message,
    // Explicitly omit `input` and `output` to reduce storage size
  }))
}

/**
 * Prunes messages by stripping toolCall input/output payloads.
 * This reduces sessionStorage footprint by 70-90% for typical tool outputs.
 */
function pruneMessagesForStorage(messages: UIMessage[]): UIMessage[] {
  return messages.map(msg => ({
    ...msg,
    toolCalls: msg.toolCalls ? pruneToolCalls(msg.toolCalls) : undefined,
  }))
}

// ============ StreamingBuffer Class ============

/**
 * Streaming performance optimizer:
 * Batches content updates to minimize React re-renders.
 * Uses requestAnimationFrame for batching during streaming,
 * and supports synchronous flushing for immediate updates.
 */
class StreamingBuffer {
  private pendingContent: string = ''
  private rafId: number | null = null
  private flushCallback: ((content: string) => void) | null = null

  append(content: string) {
    this.pendingContent += content
    this.scheduleFlush()
  }

  onFlush(callback: (content: string) => void) {
    this.flushCallback = callback
  }

  private scheduleFlush() {
    if (this.rafId !== null) return // Already scheduled

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.doFlush()
    })
  }

  /**
   * Flush pending content synchronously (used in finally block)
   */
  flush() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.doFlush()
  }

  private doFlush() {
    if (this.flushCallback && this.pendingContent) {
      const content = this.pendingContent
      this.pendingContent = ''
      this.flushCallback(content)
    }
  }

  clear() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingContent = ''
  }
}

// ============ Main Hook ============

export function useChat() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentAssistantMessageRef = useRef<UIMessage | null>(null)
  const streamingBufferRef = useRef<StreamingBuffer | null>(null)
  const messagesRef = useRef<UIMessage[]>([])

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Initialize streaming buffer on mount
  useEffect(() => {
    streamingBufferRef.current = new StreamingBuffer()

    // Set up the flush callback to update React state
    streamingBufferRef.current.onFlush((content) => {
      const assistantMsg = currentAssistantMessageRef.current
      if (!assistantMsg) return

      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsg.id
          ? { ...msg, content: msg.content + content }
          : msg
      ))
    })

    return () => streamingBufferRef.current?.clear()
  }, [])

  // Restore from session storage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as UIMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to restore chat from session storage:', e)
    }
  }, [])

  // Save to session storage when messages change
  // CRITICAL: Prune toolCalls before saving to prevent QuotaExceededError
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const prunedMessages = pruneMessagesForStorage(messages)
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(prunedMessages))
      } catch (e) {
        console.warn('Session storage quota exceeded even after pruning. Chat history not saved.', e)
      }
    }
  }, [messages])

  // Build chat context
  const buildContext = useCallback((): ChatContext => {
    return {
      currentTime: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sourcePage: 'chat',
    }
  }, [])

  // Convert UIMessage to ChatMessage for API
  const toChatMessages = useCallback((uiMessages: UIMessage[]): ChatMessage[] => {
    return uiMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))
  }, [])

  // Handle SSE events
  // Backend format: { type: '...', data: { ... }, sessionId, messageId, timestamp }
  const handleEvent = useCallback((event: ConversationEvent) => {
    const assistantMsg = currentAssistantMessageRef.current

    switch (event.type) {
      case 'result_chunk':
        // Buffer chunks for batched updates
        streamingBufferRef.current?.append(event.data.content)
        break

      case 'tool_call_start':
        // Flush any pending content before adding tool call
        streamingBufferRef.current?.flush()

        const toolCall: ToolCallStatus = {
          id: crypto.randomUUID(), // Generate ID since backend doesn't send one
          toolName: event.data.toolName,
          status: 'pending',
          input: event.data.toolInput,
        }
        if (assistantMsg) {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsg.id
              ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
              : msg
          ))
        }
        break

      case 'tool_call_end':
        if (assistantMsg) {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsg.id
              ? {
                  ...msg,
                  toolCalls: msg.toolCalls?.map(tc =>
                    tc.toolName === event.data.toolName
                      ? { ...tc, status: 'success' as const, output: event.data.toolOutput }
                      : tc
                  ),
                }
              : msg
          ))
        }
        break

      case 'error':
        setError(event.data.message)
        break
    }
  }, [])

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    setError(null)

    // Add user message
    const userMessage = createUIMessage('user', content)
    setMessages(prev => [...prev, userMessage])

    // Initialize assistant message placeholder
    const assistantMessage = createUIMessage('assistant', '')
    currentAssistantMessageRef.current = assistantMessage
    setMessages(prev => [...prev, assistantMessage])

    // Build request - use ref to get latest messages synchronously
    const request: ChatServiceRequest = {
      messages: [], // Will be built below
      context: buildContext(),
      stream: true,
    }

    // Get all history messages from ref (includes user and assistant messages)
    const historyMessages = messagesRef.current.filter(
      m => m.role === 'user' || (m.role === 'assistant' && m.content)
    )
    const allHistoryMessages = toChatMessages(historyMessages)
    request.messages = [...allHistoryMessages, { role: 'user' as const, content }]

    // Start streaming
    setIsStreaming(true)
    abortControllerRef.current = new AbortController()

    try {
      for await (const event of ChatService.streamChat(request, abortControllerRef.current.signal)) {
        handleEvent(event)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User stopped generation - keep partial response
      } else {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(message)
      }
    } finally {
      // Flush any remaining buffered content before ending
      streamingBufferRef.current?.flush()
      setIsStreaming(false)
      currentAssistantMessageRef.current = null
    }
  }, [toChatMessages, buildContext, handleEvent])

  // Stop generation
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  // Clear session
  const clearSession = useCallback(() => {
    setMessages([])
    setError(null)
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    clearSession,
  }
}

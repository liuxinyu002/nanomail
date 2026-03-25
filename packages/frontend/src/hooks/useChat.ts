import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatService, type ConversationEvent, type ChatServiceRequest } from '@/services/chat.service'
import type { ChatMessage, ChatContext } from '@nanomail/shared'

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
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCallStatus[]
  toolCallId?: string
  timestamp: string
}

const SESSION_STORAGE_KEY = 'nanomail_chat_messages'
// Todo tool names matching backend naming convention (camelCase)
const TODO_TOOL_STORAGE_WHITELIST = new Set(['createTodo', 'updateTodo', 'deleteTodo'])

function createUIMessage(
  role: 'user' | 'assistant',
  content: string
): UIMessage
function createUIMessage(
  role: 'tool',
  content: string,
  toolCallId: string
): UIMessage
function createUIMessage(
  role: 'user' | 'assistant' | 'tool',
  content: string,
  toolCallId?: string
): UIMessage {
  const msg: UIMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  }

  if (role === 'tool' && toolCallId) {
    msg.toolCallId = toolCallId
  }

  return msg
}

function pruneToolCalls(toolCalls: ToolCallStatus[]): ToolCallStatus[] {
  return toolCalls.map(tc => {
    if (TODO_TOOL_STORAGE_WHITELIST.has(tc.toolName)) {
      return {
        id: tc.id,
        toolName: tc.toolName,
        status: tc.status,
        message: tc.message,
        input: tc.input,
        output: tc.output,
      }
    }

    return {
      id: tc.id,
      toolName: tc.toolName,
      status: tc.status,
      message: tc.message,
    }
  })
}

function pruneMessagesForStorage(messages: UIMessage[]): UIMessage[] {
  return messages.map(msg => ({
    ...msg,
    toolCalls: msg.toolCalls ? pruneToolCalls(msg.toolCalls) : undefined,
  }))
}

function inferToolStatus(toolOutput?: Record<string, unknown>): {
  status: 'success' | 'error'
  message?: string
} {
  if (!toolOutput) {
    return { status: 'success' }
  }

  const resultMessage = typeof toolOutput.result === 'string' ? toolOutput.result : undefined
  const isExplicitFailure = toolOutput.status === 'failed'
  const isBusinessFailure = toolOutput.success === false
  const isErrorResult = typeof resultMessage === 'string' && resultMessage.startsWith('Error:')

  if (!isExplicitFailure && !isBusinessFailure && !isErrorResult) {
    return { status: 'success' }
  }

  if (typeof toolOutput.message === 'string' && toolOutput.message.length > 0) {
    return {
      status: 'error',
      message: toolOutput.message,
    }
  }

  if (typeof toolOutput.error === 'string') {
    return {
      status: 'error',
      message: toolOutput.error,
    }
  }

  if (toolOutput.error && typeof toolOutput.error === 'object') {
    const nestedMessage = (toolOutput.error as Record<string, unknown>).message

    if (typeof nestedMessage === 'string' && nestedMessage.length > 0) {
      return {
        status: 'error',
        message: nestedMessage,
      }
    }

    return {
      status: 'error',
      message: JSON.stringify(toolOutput.error),
    }
  }

  if (isErrorResult) {
    return {
      status: 'error',
      message: resultMessage,
    }
  }

  return {
    status: 'error',
    message: 'Tool execution failed',
  }
}

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
    if (this.rafId !== null) return

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.doFlush()
    })
  }

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

export function useChat() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentAssistantMessageRef = useRef<UIMessage | null>(null)
  const streamingBufferRef = useRef<StreamingBuffer | null>(null)
  const messagesRef = useRef<UIMessage[]>([])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    streamingBufferRef.current = new StreamingBuffer()

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

  const buildContext = useCallback((): ChatContext => {
    return {
      currentTime: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sourcePage: 'chat',
    }
  }, [])

  const toChatMessages = useCallback((uiMessages: UIMessage[]): ChatMessage[] => {
    return uiMessages.map(msg => {
      const chatMsg: ChatMessage = {
        role: msg.role,
        content: msg.content,
      }

      if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
        chatMsg.toolCalls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.toolName,
            arguments: JSON.stringify(tc.input || {}),
          },
        }))
      }

      if (msg.role === 'tool' && msg.toolCallId) {
        chatMsg.toolCallId = msg.toolCallId
      }

      return chatMsg
    })
  }, [])

  const handleEvent = useCallback((event: ConversationEvent) => {
    const assistantMsg = currentAssistantMessageRef.current

    switch (event.type) {
      case 'result_chunk':
        streamingBufferRef.current?.append(event.data.content)
        break

      case 'tool_call_start': {
        streamingBufferRef.current?.flush()

        const toolCall: ToolCallStatus = {
          id: event.data.toolCallId,
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
      }

      case 'tool_call_end':
        if (assistantMsg) {
          const { status, message } = inferToolStatus(event.data.toolOutput)

          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsg.id
              ? {
                  ...msg,
                  toolCalls: msg.toolCalls?.map(tc =>
                    tc.id === event.data.toolCallId
                      ? { ...tc, status, message, output: event.data.toolOutput }
                      : tc
                  ),
                }
              : msg
          ))

          const toolMessage = createUIMessage(
            'tool',
            JSON.stringify(event.data.toolOutput),
            event.data.toolCallId
          )
          setMessages(prev => [...prev, toolMessage])
        }
        break

      case 'error':
        setError(event.data.message)
        break
    }
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    setError(null)

    const userMessage = createUIMessage('user', content)
    setMessages(prev => [...prev, userMessage])

    const assistantMessage = createUIMessage('assistant', '')
    currentAssistantMessageRef.current = assistantMessage
    setMessages(prev => [...prev, assistantMessage])

    const request: ChatServiceRequest = {
      messages: [],
      context: buildContext(),
      stream: true,
    }

    const historyMessages = messagesRef.current.filter(
      m => m.role === 'user'
        || m.role === 'tool'
        || (m.role === 'assistant' && (m.content || (m.toolCalls && m.toolCalls.length > 0)))
    )
    const allHistoryMessages = toChatMessages(historyMessages)
    request.messages = [...allHistoryMessages, { role: 'user' as const, content }]

    setIsStreaming(true)
    abortControllerRef.current = new AbortController()

    try {
      for await (const event of ChatService.streamChat(request, abortControllerRef.current.signal)) {
        handleEvent(event)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
      } else {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(message)
      }
    } finally {
      streamingBufferRef.current?.flush()
      setIsStreaming(false)
      currentAssistantMessageRef.current = null
    }
  }, [toChatMessages, buildContext, handleEvent])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

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

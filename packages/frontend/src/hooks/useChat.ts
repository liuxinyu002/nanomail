import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChatService, type ConversationEvent, type ChatServiceRequest } from '@/services/chat.service'
import type { ChatMessage, ChatContext } from '@nanomail/shared'

// Todo tool names matching backend naming convention (camelCase)
const TODO_TOOL_NAMES = new Set(['createTodo', 'updateTodo', 'deleteTodo'])

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

const STORAGE_KEY = 'nanomail_chat_messages'
const GENERATING_WINDOW_KEY = 'nanomail_generating_window'
// Todo tool names matching backend naming convention (camelCase)
const TODO_TOOL_STORAGE_WHITELIST = new Set(['createTodo', 'updateTodo', 'deleteTodo'])

// 生成当前窗口的唯一 ID
function generateWindowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

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
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInputDisabled, setIsInputDisabled] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentAssistantMessageRef = useRef<UIMessage | null>(null)
  const streamingBufferRef = useRef<StreamingBuffer | null>(null)
  const messagesRef = useRef<UIMessage[]>([])
  // 当前窗口的唯一 ID，用于判断是否为生成发起窗口
  const windowIdRef = useRef<string>(generateWindowId())

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
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as UIMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to restore chat from localStorage:', e)
    }
  }, [])

  // 写入逻辑：阻断"回声写入"性能损耗
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const prunedMessages = pruneMessagesForStorage(messages)
        const newValue = JSON.stringify(prunedMessages)

        // 只在数据确实变更时才写入，阻止跨窗口同步引发的"回声写入"
        if (localStorage.getItem(STORAGE_KEY) !== newValue) {
          localStorage.setItem(STORAGE_KEY, newValue)
        }
      } catch (e) {
        console.warn('localStorage quota exceeded even after pruning...', e)
      }
    }
  }, [messages])

  // 监听 storage event 实现跨窗口同步
  // storage event 只在其他窗口触发，天生防循环
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // 处理聊天消息同步
      if (e.key === STORAGE_KEY) {
        if (!e.newValue) {
          setMessages([])
          return
        }

        try {
          const parsed = JSON.parse(e.newValue) as UIMessage[]
          if (Array.isArray(parsed)) {
            // 直接更新，无需判断 id 变化
            // 原因：storage event 只在"其他窗口"触发，当前窗口修改不会触发
            // 这样可以完美支持流式输出（streaming）的跨窗口实时同步
            // React 会自动处理重绘优化
            setMessages(parsed)
          }
        } catch (err) {
          console.warn('Failed to parse synced messages:', err)
        }
        return
      }

      // 处理生成窗口状态同步
      if (e.key === GENERATING_WINDOW_KEY) {
        if (!e.newValue) {
          // 其他窗口完成生成，恢复输入
          setIsInputDisabled(false)
        } else if (e.newValue !== windowIdRef.current) {
          // 其他窗口正在生成，禁用当前窗口输入
          setIsInputDisabled(true)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

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

          // Invalidate todo queries when todo-related tools complete successfully
          // This ensures Todos page reflects changes made by AI agent
          if (status === 'success' && TODO_TOOL_NAMES.has(event.data.toolName)) {
            queryClient.invalidateQueries({ queryKey: ['todos'] })
          }
        }
        break

      case 'error':
        setError(event.data.message)
        break
    }
  }, [queryClient])

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
    // 标记当前窗口为生成发起窗口，其他窗口将禁用输入
    localStorage.setItem(GENERATING_WINDOW_KEY, windowIdRef.current)
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
      // 清除生成窗口标记
      localStorage.removeItem(GENERATING_WINDOW_KEY)
    }
  }, [toChatMessages, buildContext, handleEvent])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const clearSession = useCallback(() => {
    setMessages([])
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return {
    messages,
    isStreaming,
    isInputDisabled,
    error,
    sendMessage,
    stopGeneration,
    clearSession,
  }
}

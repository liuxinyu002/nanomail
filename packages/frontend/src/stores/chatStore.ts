import { create } from 'zustand'
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
const TODO_TOOL_STORAGE_WHITELIST = new Set(['createTodo', 'updateTodo', 'deleteTodo'])

// Generate unique window ID for cross-window synchronization
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

// Load initial messages from localStorage synchronously at store creation
function loadInitialMessages(): UIMessage[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as UIMessage[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Failed to restore chat from localStorage:', e)
  }
  return []
}

// Export for testing: re-read messages from localStorage
export function hydrateMessagesFromStorage(): UIMessage[] {
  return loadInitialMessages()
}

// Check if another window is generating
function getIsInputDisabled(windowId: string): boolean {
  const generatingWindow = localStorage.getItem(GENERATING_WINDOW_KEY)
  return generatingWindow !== null && generatingWindow !== windowId
}

// Module-level variables (not serialized in store)
let abortControllerRef: AbortController | null = null
let currentAssistantMessageRef: UIMessage | null = null
const windowIdRef = generateWindowId()

// Callback for todo invalidation (set from useChat hook)
let onTodoToolSuccess: (() => void) | null = null

export function setTodoToolSuccessCallback(callback: (() => void) | null): void {
  onTodoToolSuccess = callback
}

// Helper functions that don't need to be in the store
function buildContext(): ChatContext {
  return {
    currentTime: new Date().toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sourcePage: 'chat',
  }
}

function toChatMessages(uiMessages: UIMessage[]): ChatMessage[] {
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
}

export interface ChatState {
  // Serialized state
  messages: UIMessage[]
  isStreaming: boolean
  error: string | null
  isInputDisabled: boolean

  // Actions
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  clearSession: () => void
  reset: () => void
  setMessages: (messages: UIMessage[]) => void
  setIsInputDisabled: (disabled: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state: read from localStorage once at creation
  messages: loadInitialMessages(),
  isStreaming: false,
  error: null,
  isInputDisabled: getIsInputDisabled(windowIdRef),

  sendMessage: async (content: string) => {
    const { messages } = get()

    set({ error: null })

    const userMessage = createUIMessage('user', content)
    const assistantMessage = createUIMessage('assistant', '')
    currentAssistantMessageRef = assistantMessage

    set(state => ({
      messages: [...state.messages, userMessage, assistantMessage],
    }))

    const request: ChatServiceRequest = {
      messages: [],
      context: buildContext(),
      stream: true,
    }

    const historyMessages = messages.filter(
      m => m.role === 'user'
        || m.role === 'tool'
        || (m.role === 'assistant' && (m.content || (m.toolCalls && m.toolCalls.length > 0)))
    )
    const allHistoryMessages = toChatMessages(historyMessages)
    request.messages = [...allHistoryMessages, { role: 'user' as const, content }]

    set({ isStreaming: true })
    // Mark current window as generating window
    localStorage.setItem(GENERATING_WINDOW_KEY, windowIdRef)
    abortControllerRef = new AbortController()

    try {
      for await (const event of ChatService.streamChat(request, abortControllerRef.signal)) {
        const assistantMsg = currentAssistantMessageRef
        if (!assistantMsg) continue

        // Direct synchronous processing without rAF (solves background hang issue)
        switch (event.type) {
          case 'result_chunk': {
            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === assistantMsg.id
                  ? { ...msg, content: msg.content + event.data.content }
                  : msg
              ),
            }))
            break
          }

          case 'tool_call_start': {
            const toolCall: ToolCallStatus = {
              id: event.data.toolCallId,
              toolName: event.data.toolName,
              status: 'pending',
              input: event.data.toolInput,
            }

            set(state => ({
              messages: state.messages.map(msg =>
                msg.id === assistantMsg.id
                  ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
                  : msg
              ),
            }))
            break
          }

          case 'tool_call_end': {
            const { status, message } = inferToolStatus(event.data.toolOutput)

            set(state => ({
              messages: state.messages.map(msg =>
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
              ),
            }))

            const toolMessage = createUIMessage(
              'tool',
              JSON.stringify(event.data.toolOutput),
              event.data.toolCallId
            )
            set(state => ({
              messages: [...state.messages, toolMessage],
            }))

            // Invalidate todo queries when todo-related tools complete successfully
            if (status === 'success' && TODO_TOOL_NAMES.has(event.data.toolName)) {
              onTodoToolSuccess?.()
            }
            break
          }

          case 'error': {
            set({ error: event.data.message })
            break
          }
        }
      }
    } catch (err) {
      // Distinguish between user abort and actual errors
      if (err instanceof Error && err.name === 'AbortError') {
        // User initiated abort, handle silently
      } else {
        set({ error: err instanceof Error ? err.message : 'An unexpected error occurred' })
      }
    } finally {
      // ========== Absolute cleanup block ==========
      // 1. Reset streaming state
      set({ isStreaming: false })

      // 2. Clear AbortController
      if (abortControllerRef) {
        abortControllerRef = null
      }

      // 3. Clear current message reference
      currentAssistantMessageRef = null

      // 4. Release cross-window lock (most critical)
      localStorage.removeItem(GENERATING_WINDOW_KEY)
      // =============================================
    }
  },

  stopGeneration: () => {
    abortControllerRef?.abort()
  },

  clearSession: () => {
    set({ messages: [], error: null })
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(GENERATING_WINDOW_KEY)
  },

  reset: () => {
    set({
      messages: [],
      error: null,
      isStreaming: false,
      isInputDisabled: false,
    })
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(GENERATING_WINDOW_KEY)
  },

  setMessages: (messages: UIMessage[]) => {
    set({ messages })
  },

  setIsInputDisabled: (disabled: boolean) => {
    set({ isInputDisabled: disabled })
  },
}))

// localStorage sync: write when messages change
// This is called from the useChat hook via useEffect
let lastSyncedMessagesJson: string | null = null

// Reset the sync state (used in tests)
export function resetStorageSync(): void {
  lastSyncedMessagesJson = null
}

export function syncMessagesToStorage(messages: UIMessage[]): void {
  if (messages.length > 0) {
    try {
      const prunedMessages = pruneMessagesForStorage(messages)
      const newValue = JSON.stringify(prunedMessages)

      // Only write if data actually changed (prevent echo writes)
      if (lastSyncedMessagesJson !== newValue) {
        localStorage.setItem(STORAGE_KEY, newValue)
        lastSyncedMessagesJson = newValue
      }
    } catch (e) {
      console.warn('localStorage quota exceeded even after pruning...', e)
    }
  }
}

// Handle storage events for cross-window sync
export function handleStorageEvent(
  event: StorageEvent,
  setMessages: (messages: UIMessage[]) => void,
  setIsInputDisabled: (disabled: boolean) => void
): void {
  // Handle chat messages sync
  if (event.key === STORAGE_KEY) {
    if (!event.newValue) {
      setMessages([])
      lastSyncedMessagesJson = null
      return
    }

    try {
      const parsed = JSON.parse(event.newValue) as UIMessage[]
      if (Array.isArray(parsed)) {
        setMessages(parsed)
        lastSyncedMessagesJson = event.newValue
      }
    } catch (err) {
      console.warn('Failed to parse synced messages:', err)
    }
    return
  }

  // Handle generating window state sync
  if (event.key === GENERATING_WINDOW_KEY) {
    if (!event.newValue) {
      // Other window completed generation, restore input
      setIsInputDisabled(false)
    } else if (event.newValue !== windowIdRef) {
      // Other window is generating, disable current window input
      setIsInputDisabled(true)
    }
  }
}

// Expose windowIdRef for external use
export const getWindowId = () => windowIdRef

// Export constants for use in hooks
export { STORAGE_KEY, GENERATING_WINDOW_KEY }
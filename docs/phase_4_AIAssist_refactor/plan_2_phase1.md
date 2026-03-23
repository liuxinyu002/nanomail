# Phase 1: Foundation (Service & Hook)

> Frontend Chat Page Implementation - Phase 1 of 5
> Estimated Time: 2-3 hours

---

## Context Summary

### Project Goal
Implement a frontend Chat Page that provides a conversational interface for AI-assisted todo management. Users can interact with the AI assistant through natural language to create, update, and delete todos.

### Scope (This Phase)
| Module | Change Type | Description |
|--------|-------------|-------------|
| Chat Service | New | SSE connection wrapper using `eventsource-parser` |
| useChat Hook | New | SSE state management with session storage backup |

### Key Design Decisions
- **Session Storage Backup**: Messages cached in sessionStorage, restored on page load
- **Data Pruning**: Strip `input`/`output` payloads from `toolCalls` before saving to prevent QuotaExceededError
- **Streaming Performance**: Batched React updates with `requestAnimationFrame` to minimize re-renders

### Backend API Contract
**Endpoint:** `POST /api/agent/chat`

```typescript
{
  messages: ChatMessage[],   // Full conversation history
  context: ChatContext,      // currentTime, timeZone, sourcePage
  stream?: boolean           // Default: true
}
```

**SSE Event Types:**
| Event | Purpose |
|-------|---------|
| `session_start` | Session initialized |
| `thinking` | AI reasoning (collapsible in UI) |
| `tool_call_start` | Tool invocation started |
| `tool_call_end` | Tool completed |
| `result_chunk` | Final response text chunk |
| `session_end` | Session completed |
| `error` | Error occurred |

---

## Implementation Steps

### Step 1.1: Create Chat Service

**File:** `packages/frontend/src/services/chat.service.ts`

**Action:** Create SSE connection wrapper using `eventsource-parser`

**Why:** Encapsulate fetch logic, handle abort, return async iterable

**Dependencies:** None

**Risk:** Low

```typescript
import { createParser, type EventSourceParser } from 'eventsource-parser'
import type { ChatMessage, ChatContext } from '@nanomail/shared'

export interface ChatRequest {
  messages: ChatMessage[]
  context: ChatContext
  stream?: boolean
}

// SSE Event Types - must match backend
export type ConversationEvent =
  | { type: 'session_start'; sessionId: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string; input?: Record<string, unknown> }
  | { type: 'tool_call_end'; toolCallId: string; output?: Record<string, unknown>; message?: string }
  | { type: 'result_chunk'; content: string }
  | { type: 'session_end' }
  | { type: 'error'; error: string }

export const ChatService = {
  async *streamChat(
    request: ChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ConversationEvent> {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
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
    let buffer = ''

    const parser = createParser((event) => {
      if (event.type === 'event') {
        try {
          const data = JSON.parse(event.data) as ConversationEvent
          // Yield will be handled outside
          buffer += JSON.stringify(data) + '\n'
        } catch (e) {
          console.error('Failed to parse SSE event:', e)
        }
      }
    })

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      parser.feed(chunk)

      // Process any complete events in buffer
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            yield JSON.parse(line) as ConversationEvent
          } catch {
            // Skip malformed lines
          }
        }
      }
    }
  },
}
```

---

### Step 1.2: Update Services Index

**File:** `packages/frontend/src/services/index.ts`

**Action:** Export `ChatService` and related types

**Dependencies:** Step 1.1

**Risk:** Low

```typescript
// Add to existing exports
export { ChatService, type ChatRequest, type ConversationEvent } from './chat.service'
```

---

### Step 1.3: Create useChat Hook

**File:** `packages/frontend/src/hooks/useChat.ts`

**Action:** Implement SSE state management hook with session storage backup

**Features:**
- Message history management (local state)
- Session storage backup with data pruning
- Streaming performance optimization via requestAnimationFrame
- SSE connection lifecycle
- Tool call status tracking
- Error handling
- AbortController for cleanup and stop generation

**Dependencies:** Step 1.1

**Risk:** Medium - SSE state management complexity

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatService, type ConversationEvent, type ChatRequest } from '@/services/chat.service'
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
 * Batches React state updates using requestAnimationFrame to prevent
 * excessive re-renders during rapid SSE event processing.
 * Without this, each result_chunk triggers a full React re-render cycle,
 * causing jank and high CPU usage.
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
      if (this.flushCallback && this.pendingContent) {
        this.flushCallback(this.pendingContent)
        this.pendingContent = ''
      }
      this.rafId = null
    })
  }

  flush() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (this.flushCallback && this.pendingContent) {
      this.flushCallback(this.pendingContent)
      this.pendingContent = ''
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

  // Initialize streaming buffer on mount
  useEffect(() => {
    streamingBufferRef.current = new StreamingBuffer()

    // Set up the flush callback to update React state
    streamingBufferRef.current.onFlush((content) => {
      if (!currentAssistantMessageRef.current) return

      setMessages(prev => prev.map(msg =>
        msg.id === currentAssistantMessageRef.current?.id
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
  const handleEvent = useCallback((event: ConversationEvent) => {
    switch (event.type) {
      case 'result_chunk':
        // Buffer chunks and flush via requestAnimationFrame
        streamingBufferRef.current?.append(event.content)
        break

      case 'tool_call_start':
        // Flush any pending content before adding tool call
        streamingBufferRef.current?.flush()

        const toolCall: ToolCallStatus = {
          id: event.toolCallId,
          toolName: event.toolName,
          status: 'pending',
          input: event.input,
        }
        setMessages(prev => prev.map(msg =>
          msg.id === currentAssistantMessageRef.current?.id
            ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
            : msg
        ))
        break

      case 'tool_call_end':
        setMessages(prev => prev.map(msg =>
          msg.id === currentAssistantMessageRef.current?.id
            ? {
                ...msg,
                toolCalls: msg.toolCalls?.map(tc =>
                  tc.id === event.toolCallId
                    ? { ...tc, status: 'success', output: event.output, message: event.message }
                    : tc
                ),
              }
            : msg
        ))
        break

      case 'error':
        setError(event.error)
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

    // Build request
    const allMessages = toChatMessages([...messages, { ...userMessage, toolCalls: undefined }])
    const request: ChatRequest = {
      messages: allMessages,
      context: buildContext(),
      stream: true,
    }

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
        console.log('Generation stopped by user')
      } else {
        handleError(err)
      }
    } finally {
      // Flush any remaining buffered content before ending
      streamingBufferRef.current?.flush()
      setIsStreaming(false)
      currentAssistantMessageRef.current = null
    }
  }, [messages, toChatMessages, buildContext, handleEvent])

  // Handle errors
  const handleError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    setError(message)
    console.error('Chat error:', err)
  }, [])

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
```

---

## Acceptance Criteria

- [ ] `ChatService.streamChat()` returns async generator of `ConversationEvent`
- [ ] `useChat` hook manages message state correctly
- [ ] Session storage backup saves messages on change
- [ ] Session storage restore works on page load
- [ ] `StreamingBuffer` batches `result_chunk` events via RAF
- [ ] `stopGeneration()` aborts SSE connection
- [ ] Data pruning strips `input`/`output` from tool calls before storage

---

## Dependencies

### Existing
- `eventsource-parser` (v3.0.6) - already installed
- `@nanomail/shared` - ChatMessage, ChatContext types

### File Structure After This Phase
```
packages/frontend/src/
├── services/
│   ├── chat.service.ts    # NEW
│   └── index.ts           # MODIFIED
└── hooks/
    └── useChat.ts         # NEW
```

---

## Next Phase

→ [Phase 2: Core UI Components](./plan_2_phase2.md)

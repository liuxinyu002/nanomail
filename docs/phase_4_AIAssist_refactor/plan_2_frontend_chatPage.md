# Frontend Chat Page Implementation Plan

> Phase 4 - AI Assist Feature Refactor
> Version: 2.0
> Date: 2026-03-22
>
> **v2.0 Changes:**
> - **UI Style**: Switched from "chat bubbles" to "document flow" layout (ChatGPT/Claude style)
> - **Information Density**: Added interactive Todo widgets and collapsible tool calls
> - **User Interaction**: Added stop generation, modern loading state, session storage backup
> - **Session Storage**: Data pruning strips toolCall input/output payloads before saving to prevent QuotaExceededError
> - **ToolCallAccordion**: Auto-expands while tools pending, auto-collapses 800ms after completion
> - **MarkdownRenderer**: Uses Component Property Filtering via react-markdown's `components` prop (not regex) to filter duplicate task lists
> - **Auto-scroll**: Smart ResizeObserver with isNearBottom detection - won't interrupt user scrolling up
> - **ChatInput**: IME-aware with `e.nativeEvent.isComposing` check, dynamic Send/Stop states, auto-expanding textarea
> - **Todo Extraction**: Uses flatMap to aggregate todos from multiple tool calls
> - **Streaming Performance**: Batched React updates with requestAnimationFrame to minimize re-renders

---

## 1. Overview

### 1.1 Goal

Implement a frontend Chat Page that provides a conversational interface for AI-assisted todo management. Users can interact with the AI assistant through natural language to create, update, and delete todos.

### 1.2 Scope

| Module | Change Type | Description |
|--------|-------------|-------------|
| Chat Page | New | Route `/chat` with message list and input |
| Chat Hook | New | SSE connection, message state, session storage backup |
| Chat Service | New | API wrapper for `/api/agent/chat` |
| UI Components | New | MessageItem, MessageList, ChatInput, ToolStatusBadge, LoadingIndicator, TodoCardWidget |
| Navigation | Modification | Add Chat entry to sidebar |

### 1.3 Out of Scope

- Conversation persistence to database (session storage backup only)
- Email association feature
- Multi-user support (MVP single user)

---

## 2. Requirements Summary

### 2.1 Core Design Decisions

| Aspect | Decision |
|--------|----------|
| **Page Route** | `/chat`, new navigation entry in sidebar |
| **Session Mode** | Temporary session with sessionStorage backup (recover from accidental refresh) |
| **Layout** | Document flow layout, `max-w-3xl` centered, fixed input at bottom |
| **Message Style** | **Document flow** - all messages left-aligned, no bubbles. Avatar + label for role distinction. Full width for rich content (tables, code, lists). |
| **Input** | Auto-expanding multi-line textarea, Enter to send, Shift+Enter for newline, **Stop button during streaming** |

### 2.2 Interaction Details

| Feature | Behavior |
|---------|----------|
| **Tool Call Feedback** | Collapsible accordion. Default: `⚙️ Performed N actions`. Expand to see details. |
| **Loading State** | Blinking cursor (`█`) or pulsing AI icon next to avatar. **No bouncing dots.** |
| **Stop Generation** | During streaming, Send button becomes Stop button (square icon). Click to abort. |
| **Interactive Todos** | Checkboxes in AI responses trigger real API calls to update todo status. |
| **Session Recovery** | Messages cached in sessionStorage. Restored on page load if available. |
| **Smart Auto-Scroll** | Only auto-scrolls if user is within 100px of bottom. Won't interrupt users reading earlier messages. |
| **IME Support** | `e.nativeEvent.isComposing` check prevents premature send during Chinese/Japanese/Korean input. |
| **Streaming Performance** | RAF-batched updates for smooth 60fps rendering during rapid SSE chunks. |
| **Transition Animation** | Fade-in for new messages (150ms ease-out per design spec) |

### 2.3 UI Layout Principles (Document Flow)

**Why Document Flow over Chat Bubbles:**

1. **Better Markdown Rendering**: Tables, long lists, and code blocks display naturally without width constraints from bubble containers.

2. **Improved Readability**: No left-right eye movement. All content flows left-to-right, top-to-bottom like a document.

3. **Professional AI Experience**: Matches ChatGPT, Claude, and other modern AI assistants.

**Layout Rules:**

| Element | Style |
|---------|-------|
| Message alignment | All messages left-aligned (flush left) |
| Background | No message background color (no bubbles) |
| Role distinction | Avatar + label ("You" / "AI Assistant") at message header |
| Width | Full `max-w-3xl` for rich content |
| Spacing | Adequate margin between message turns, optional subtle divider |

### 2.4 Backend API Contract

**Endpoint:** `POST /api/agent/chat`

**Request:**
```typescript
{
  messages: ChatMessage[],   // Full conversation history
  context: ChatContext,      // Time, timezone, page info
  stream?: boolean           // Default: true
}
```

**SSE Event Types:**
| Event | Purpose |
|-------|---------|
| `session_start` | Session initialized |
| `thinking` | AI reasoning (collapsible in UI) |
| `tool_call_start` | Tool invocation started |
| `tool_call_end` | Tool completed, frontend updates local state |
| `result_chunk` | Final response text chunk |
| `session_end` | Session completed |
| `error` | Error occurred |

---

## 3. Architecture Design

### 3.1 File Structure

```
packages/frontend/src/
├── features/chat/
│   ├── index.ts                    # Public exports
│   ├── ChatPage.tsx                # Main page component
│   ├── MessageList.tsx             # Message list container with auto-scroll
│   ├── MessageItem.tsx             # Single message (document flow style)
│   ├── ToolCallAccordion.tsx       # Collapsible tool calls container
│   ├── ToolStatusBadge.tsx         # Tool call status indicator
│   ├── ChatInput.tsx               # Auto-expanding input with Stop button
│   ├── LoadingIndicator.tsx        # Blinking cursor / pulsing icon
│   ├── MarkdownRenderer.tsx        # Markdown with interactive components
│   ├── TodoCardWidget.tsx          # Interactive todo list card
│   └── __tests__/
│       ├── ChatPage.test.tsx
│       ├── MessageList.test.tsx
│       ├── MessageItem.test.tsx
│       ├── ChatInput.test.tsx
│       └── useChat.test.ts
├── hooks/
│   └── useChat.ts                  # SSE connection, message state, session storage
├── services/
│   ├── chat.service.ts             # API wrapper for SSE
│   └── index.ts                    # Add ChatService export
├── components/layout/
│   └── MainLayout.tsx              # Add Chat nav item
└── App.tsx                         # Add /chat route
```

### 3.2 Component Hierarchy

```
ChatPage
├── MessageList
│   └── MessageItem (multiple)
│       ├── MessageHeader (Avatar + Label)
│       ├── MarkdownRenderer
│       │   └── InteractiveCheckbox (for todo items)
│       ├── TodoCardWidget (optional, for structured todo data)
│       └── ToolCallAccordion (collapsible)
│           └── ToolStatusBadge (multiple, when expanded)
├── LoadingIndicator (when streaming, before first token)
└── ChatInput
    ├── Auto-expanding textarea
    └── SendButton / StopButton (dynamic)
```

### 3.3 State Management

```typescript
// useChat hook internal state
interface ChatState {
  messages: UIMessage[]           // Local conversation history
  isStreaming: boolean            // Active SSE connection
  currentContent: string          // Accumulated result_chunk content
  error: string | null            // Error message
}

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCallStatus[]    // Tool calls embedded in message
  timestamp: string
}

interface ToolCallStatus {
  id: string
  toolName: string
  status: 'pending' | 'success' | 'error'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  message?: string  // Human-readable status
}

// Session storage key
const SESSION_STORAGE_KEY = 'nanomail_chat_messages'
```

**Design Decision:** Tool calls are embedded directly in `UIMessage.toolCalls` rather than maintained as a separate global state. This ensures:
- Tool status badges are bound to their corresponding AI message
- Historical tool calls persist correctly across multi-turn conversations
- No state synchronization bugs between separate state arrays

### 3.4 SSE Event Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         useChat Hook                             │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ sendMessage  │───►│ fetch POST   │───►│ EventSourceParser│   │
│  │ (user input) │    │ /api/agent/  │    │ (SSE parsing)    │   │
│  └──────────────┘    │ chat         │    └────────┬─────────┘   │
│                      └──────────────┘             │              │
│                                                   ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Event Handlers                         │   │
│  │  session_start   → Initialize sessionId                   │   │
│  │  thinking        → Append to currentContent (collapsible) │   │
│  │  tool_call_start → Add pending ToolCall to current msg    │   │
│  │  tool_call_end   → Update ToolCall status in current msg  │   │
│  │  result_chunk    → Append to currentContent               │   │
│  │  session_end     → Finalize message, save to sessionStorage│   │
│  │  error           → Set error state, show toast            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Session Storage Backup                        │   │
│  │  - Save messages after each turn                          │   │
│  │  - Restore on page load                                   │   │
│  │  - Clear on explicit new conversation                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Steps

### Phase 1: Foundation (Service & Hook) - 2-3 hours

#### Step 1.1: Create Chat Service
**File:** `packages/frontend/src/services/chat.service.ts`

- Action: Create SSE connection wrapper using `eventsource-parser`
- Why: Encapsulate fetch logic, handle abort, return async iterable
- Dependencies: None
- Risk: Low

```typescript
// Key implementation pattern
export const ChatService = {
  async *streamChat(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<ConversationEvent> {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
      signal,
    })

    const parser = createParser((event) => {
      if (event.type === 'event') {
        const data = JSON.parse(event.data)
        yield data as ConversationEvent
      }
    })

    const reader = response.body!.getReader()
    // ... streaming logic
  }
}
```

#### Step 1.2: Update Services Index
**File:** `packages/frontend/src/services/index.ts`

- Action: Export `ChatService` and related types
- Dependencies: Step 1.1
- Risk: Low

#### Step 1.3: Create useChat Hook
**File:** `packages/frontend/src/hooks/useChat.ts`

- Action: Implement SSE state management hook with session storage backup
- Features:
  - Message history management (local state)
  - **Session storage backup with data pruning** (save on change, restore on mount)
  - **Data pruning**: Strip `input`/`output` payloads from `toolCalls` before saving to prevent quota crashes
  - **Streaming performance optimization**: Batch React updates with requestAnimationFrame
  - SSE connection lifecycle
  - Tool call status tracking
  - Error handling
  - AbortController for cleanup and stop generation
- Dependencies: Step 1.1
- Risk: Medium - SSE state management complexity

```typescript
const SESSION_STORAGE_KEY = 'nanomail_chat_messages'

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
    if (this.rafId !== null) return  // Already scheduled

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

export function useChat() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
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
        // QuotaExceededError - should be rare after pruning, but handle gracefully
        console.warn('Session storage quota exceeded even after pruning. Chat history not saved.', e)
      }
    }
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage = createUIMessage('user', content)
    setMessages(prev => [...prev, userMessage])

    // Initialize assistant message placeholder
    const assistantMessage = createUIMessage('assistant', '')
    currentAssistantMessageRef.current = assistantMessage
    setMessages(prev => [...prev, assistantMessage])

    // Start streaming
    setIsStreaming(true)
    abortControllerRef.current = new AbortController()

    try {
      for await (const event of ChatService.streamChat(request, abortControllerRef.current.signal)) {
        handleEvent(event)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User stopped generation - keep partial response
        console.log('Generation stopped by user')
      } else {
        handleError(error)
      }
    } finally {
      // Flush any remaining buffered content before ending
      streamingBufferRef.current?.flush()
      setIsStreaming(false)
      currentAssistantMessageRef.current = null
    }
  }, [])

  // Stop generation
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  // Clear session
  const clearSession = useCallback(() => {
    setMessages([])
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  }, [])

  // Event handlers update the current assistant message directly
  const handleResultChunk = (event: ResultChunkEvent) => {
    // PERFORMANCE: Buffer chunks and flush via requestAnimationFrame
    // This batches React updates to animation frames, preventing
    // excessive re-renders when receiving 50+ chunks per second
    streamingBufferRef.current?.append(event.content)
  }

  const handleToolCallStart = (event: ToolCallStartEvent) => {
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
  }

  const handleToolCallEnd = (event: ToolCallEndEvent) => {
    setMessages(prev => prev.map(msg =>
      msg.id === currentAssistantMessageRef.current?.id
        ? {
            ...msg,
            toolCalls: msg.toolCalls?.map(tc =>
              tc.id === event.toolCallId
                ? { ...tc, status: 'success', output: event.output, message: event.message }
                : tc
            )
          }
        : msg
    ))
  }

  return { messages, isStreaming, sendMessage, stopGeneration, clearSession }
}
```

**Streaming Performance Optimization Details:**

1. **Problem:** SSE sends `result_chunk` events rapidly (10-50+ per second). Each `setMessages` call triggers React reconciliation and re-renders the entire message list.

2. **Solution:** `StreamingBuffer` class batches content updates using `requestAnimationFrame`:
   - Chunks are appended to a buffer string
   - A single RAF callback flushes the buffer to React state
   - This limits React updates to ~60fps max, regardless of chunk frequency

3. **Benefits:**
   - Reduces CPU usage by 50-80% during streaming
   - Prevents UI jank and dropped frames
   - Maintains smooth typing animation feel

4. **Edge Cases:**
   - Tool call events trigger immediate flush (so tool status shows promptly)
   - Stream end triggers final flush (no content lost)
   - Abort/cleanup clears the buffer properly

---

### Phase 2: Core UI Components - 4-5 hours

#### Step 2.1: Create LoadingIndicator Component
**File:** `packages/frontend/src/features/chat/LoadingIndicator.tsx`

- Action: Create modern loading indicator (blinking cursor or pulsing icon)
- Design: Per `docs/SPEC/design-system.md` - 150ms ease-out fade-in
- **Change:** Use blinking cursor instead of bouncing dots
- Dependencies: None
- Risk: Low

```typescript
// Blinking cursor - matches AI text generation feel
export function LoadingIndicator() {
  return (
    <span className="inline-block w-2 h-5 bg-gray-800 animate-pulse" />
  )
}

// Alternative: Pulsing AI icon
export function LoadingIndicatorIcon() {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Sparkles className="h-4 w-4 animate-pulse" />
      <span className="text-sm">Thinking...</span>
    </div>
  )
}
```

#### Step 2.2: Create ToolCallAccordion Component
**File:** `packages/frontend/src/features/chat/ToolCallAccordion.tsx`

- Action: Create collapsible container for multiple tool calls
- **Purpose:** Reduce visual noise when AI performs multiple actions
- Features:
  - Collapsed: Show summary (`⚙️ Performed 3 actions`)
  - Expanded: Show individual ToolStatusBadge components
  - **Auto-expand while any tool is pending**
  - **Auto-collapse when all tools complete**
- Dependencies: Step 2.3 (ToolStatusBadge)
- Risk: Low

```typescript
interface ToolCallAccordionProps {
  toolCalls: ToolCallStatus[]
}

export function ToolCallAccordion({ toolCalls }: ToolCallAccordionProps) {
  const hasPending = toolCalls.some(tc => tc.status === 'pending')
  const [expanded, setExpanded] = useState(hasPending)

  // Auto-expand when pending, auto-collapse when all complete
  useEffect(() => {
    if (hasPending) {
      setExpanded(true)
    } else if (expanded && !hasPending) {
      // Small delay before collapsing to let user see completion
      const timer = setTimeout(() => setExpanded(false), 800)
      return () => clearTimeout(timer)
    }
  }, [hasPending, expanded])

  if (toolCalls.length === 0) return null

  // Single tool call: show inline without accordion
  if (toolCalls.length === 1) {
    return <ToolStatusBadge {...toolCalls[0]} />
  }

  // Multiple tool calls: collapsible accordion
  const successCount = toolCalls.filter(tc => tc.status === 'success').length
  const pendingCount = toolCalls.filter(tc => tc.status === 'pending').length
  const errorCount = toolCalls.filter(tc => tc.status === 'error').length

  const summary = pendingCount > 0
    ? `Processing ${pendingCount} action${pendingCount > 1 ? 's' : ''}...`
    : errorCount > 0
      ? `Completed with ${errorCount} error${errorCount > 1 ? 's' : ''}`
      : `Performed ${successCount} action${successCount > 1 ? 's' : ''}`

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          {summary}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>
      {expanded && (
        <div className="p-2 space-y-1 bg-white">
          {toolCalls.map(tc => (
            <ToolStatusBadge key={tc.id} {...tc} />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### Step 2.3: Create ToolStatusBadge Component
**File:** `packages/frontend/src/features/chat/ToolStatusBadge.tsx`

- Action: Create inline status indicator for tool calls
- States: `pending` (spinning), `success` (checkmark), `error` (X)
- Design: Minimal, text-based with icon
- Dependencies: None
- Risk: Low

```typescript
interface ToolStatusBadgeProps {
  toolName: string
  status: 'pending' | 'success' | 'error'
  message?: string
}

export function ToolStatusBadge({ toolName, status, message }: ToolStatusBadgeProps) {
  const icons = {
    pending: <Loader2 className="h-3 w-3 animate-spin" />,
    success: <Check className="h-3 w-3 text-green-600" />,
    error: <X className="h-3 w-3 text-red-600" />,
  }

  const displayMessage = status === 'pending'
    ? `${toolName}...`
    : message || toolName

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
      {icons[status]}
      <span>{displayMessage}</span>
    </div>
  )
}
```

#### Step 2.4: Create MarkdownRenderer Component
**File:** `packages/frontend/src/features/chat/MarkdownRenderer.tsx`

- Action: Create markdown-to-React renderer with interactive components
- Features:
  - GFM support (task lists, tables, strikethrough) via `remark-gfm`
  - **Component Property Filtering**: Use react-markdown's `components` prop to intercept and filter duplicate task lists
  - Links open in new tab
  - Safe HTML rendering (no XSS)
- Dependencies: None
- Risk: Medium - Component filtering logic

```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  onTodoToggle?: (todoId: string, checked: boolean) => void
  todoIds?: Set<string>  // IDs of todos in TodoCardWidget for deduplication
}

/**
 * Component Property Filtering Strategy:
 *
 * Instead of regex-based text preprocessing, we use react-markdown's `components`
 * prop to intercept rendered elements. This works on the parsed AST, not raw text.
 *
 * Why this is better than regex:
 * 1. Handles nested lists correctly (regex would break)
 * 2. Handles escaped characters and code blocks properly
 * 3. More maintainable - we work with structured data, not string manipulation
 * 4. react-markdown already parses the AST; we just filter at render time
 *
 * Implementation:
 * - remark-gfm adds `task-list-item` class to <li> elements containing checkboxes
 * - Our custom `li` component checks text content against todoIds
 * - Matching items return null (not rendered), preventing duplicate checkboxes
 */
export function MarkdownRenderer({ content, onTodoToggle, todoIds }: MarkdownRendererProps) {
  // Determine if a task list item should be filtered out
  const shouldSkipTaskItem = (textContent: string): boolean => {
    if (!todoIds || todoIds.size === 0) return false
    // Check if any todo ID appears in the text
    for (const id of todoIds) {
      if (textContent.includes(id)) return true
    }
    // If we have todoIds but can't match by ID, skip all task items when widget is present
    // This ensures zero duplicate checkboxes
    return true
  }

  const components: Components = {
    // Open links in new tab
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
        {children}
      </a>
    ),
    // Intercept list items to filter task list duplicates via Component Property Filtering
    li: ({ children, className, ...props }) => {
      // Check if this is a task list item (remark-gfm adds this class)
      const isTaskItem = className?.includes('task-list-item')

      if (isTaskItem && todoIds && todoIds.size > 0) {
        // Extract text content from children to check against todoIds
        const textContent = extractTextContent(children)
        if (shouldSkipTaskItem(textContent)) {
          // Return null to skip rendering this list item entirely
          return null
        }
      }

      return (
        <li className={className} {...props}>
          {children}
        </li>
      )
    },
    // Render remaining checkboxes (if any) as interactive
    input: ({ type, checked, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              const siblingText = (e.target.parentElement?.textContent || '').trim()
              onTodoToggle?.(siblingText, e.target.checked)
            }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            {...props}
          />
        )
      }
      return <input type={type} checked={checked} {...props} />
    },
  }

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/**
 * Recursively extract text content from React children.
 * Used for Component Property Filtering to match task items against todoIds.
 */
function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (!children) return ''

  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('')
  }

  if (typeof children === 'object' && 'props' in children && children.props?.children) {
    return extractTextContent(children.props.children)
  }

  return ''
}
```

**Component Property Filtering vs Regex:**

| Aspect | Regex Preprocessing | Component Property Filtering |
|--------|---------------------|------------------------------|
| Works on | Raw text string | Parsed React elements (via `components` prop) |
| Nested lists | Breaks easily | Handles correctly |
| Escaped chars | Requires escaping | Handled by parser |
| Code blocks | May match falsely | No false positives |
| Maintainability | Fragile patterns | Structured component logic |
| Performance | String ops before render | Filter during render |
| Implementation | Custom string manipulation | Standard react-markdown API |

#### Step 2.5: Create TodoCardWidget Component
**File:** `packages/frontend/src/features/chat/TodoCardWidget.tsx`

- Action: Create interactive todo card for structured tool output
- **Purpose:** Provide truly interactive todo list when AI performs todo operations
- Features:
  - Display todo items with real checkboxes
  - Checkbox clicks trigger API to update status
  - Show due dates, priorities
  - Edit/delete buttons (optional for MVP)
- Dependencies: Todo service
- Risk: Medium

```typescript
import { todoService } from '@/services/todo.service'

interface TodoCardWidgetProps {
  todos: Todo[]
  onUpdate?: () => void
}

export function TodoCardWidget({ todos, onUpdate }: TodoCardWidgetProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleToggle = async (todoId: string, currentStatus: boolean) => {
    setUpdatingId(todoId)
    try {
      await todoService.update(todoId, { completed: !currentStatus })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update todo:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Todos</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {todos.map(todo => (
          <li key={todo.id} className="px-3 py-2 flex items-center gap-3 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggle(todo.id, todo.completed)}
              disabled={updatingId === todo.id}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={cn(
              "flex-1 text-sm",
              todo.completed && "line-through text-gray-400"
            )}>
              {todo.title}
            </span>
            {todo.deadline && (
              <span className="text-xs text-gray-500">
                {formatDeadline(todo.deadline)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

#### Step 2.6: Create MessageItem Component
**File:** `packages/frontend/src/features/chat/MessageItem.tsx`

- Action: Create message component with **document flow** layout
- **Design Change:** No bubbles, all left-aligned, avatar + label for distinction
- Design: Per design spec - minimalist, borderless
  - All messages: Left-aligned, no background
  - Avatar: User icon (blue) / AI icon (purple/gray)
  - Label: "You" / "AI Assistant"
  - Full width for rich content
- Dependencies: Steps 2.2, 2.4, 2.5
- Risk: Low

```typescript
import { useMemo } from 'react'
import type { UIMessage, ToolCallStatus } from '@/hooks/useChat'
import type { Todo } from '@nanomail/shared'
import { cn } from '@/lib/utils'
import { User, Sparkles } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { TodoCardWidget } from './TodoCardWidget'
import { ToolCallAccordion } from './ToolCallAccordion'
import { LoadingIndicator } from './LoadingIndicator'

interface MessageItemProps {
  message: UIMessage
  isStreaming?: boolean
  onTodoUpdate?: () => void
}

export function MessageItem({ message, isStreaming, onTodoUpdate }: MessageItemProps) {
  const isUser = message.role === 'user'

  // Extract todos from tool calls for TodoCardWidget
  const todosFromToolCalls = useMemo(() => extractTodosFromToolCalls(message.toolCalls), [message.toolCalls])
  const hasStructuredTodoWidget = todosFromToolCalls.length > 0

  // Create Set of todo IDs for MarkdownRenderer deduplication
  const todoIds = useMemo(() => new Set(todosFromToolCalls.map(t => t.id)), [todosFromToolCalls])

  return (
    <div className="py-4 animate-in fade-in duration-150 ease-out">
      {/* Message Header: Avatar + Label */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-blue-600" : "bg-purple-100"
        )}>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <Sparkles className="h-4 w-4 text-purple-600" />
          )}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {isUser ? 'You' : 'AI Assistant'}
        </span>
        {isStreaming && !message.content && (
          <LoadingIndicator />
        )}
      </div>

      {/* Message Content: Full width, no bubble */}
      <div className="ml-9">
        {isUser ? (
          <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer
              content={message.content}
              onTodoToggle={onTodoUpdate}
              todoIds={todoIds}
            />
            {/* Structured todo widget - rendered when tool returns todo data */}
            {hasStructuredTodoWidget && (
              <TodoCardWidget
                todos={todosFromToolCalls}
                onUpdate={onTodoUpdate}
              />
            )}
            {/* Tool calls accordion */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCallAccordion toolCalls={message.toolCalls} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Helper to extract todos from tool call output
// Uses flatMap to aggregate todos from ALL tool calls, not just the first one
function extractTodosFromToolCalls(toolCalls?: ToolCallStatus[]): Todo[] {
  if (!toolCalls) return []

  // CRITICAL: Use flatMap to aggregate todos from multiple tool calls
  // Previously this used a for-loop that returned on first match, missing todos
  // from subsequent tool calls in the same message
  return toolCalls.flatMap(tc => {
    // Handle both { todos: [...] } and direct array outputs
    if (tc.output?.todos && Array.isArray(tc.output.todos)) {
      return tc.output.todos as Todo[]
    }
    // Some tools might return a single todo directly
    if (tc.output?.todo && !Array.isArray(tc.output.todo)) {
      return [tc.output.todo as Todo]
    }
    return []
  })
}
```

#### Step 2.7: Create MessageList Component
**File:** `packages/frontend/src/features/chat/MessageList.tsx`

- Action: Create scrollable message container with smart auto-scroll
- Features:
  - **Smart auto-scroll with `isNearBottom` detection**
  - Only auto-scrolls if user is near bottom (within 100px threshold)
  - Won't interrupt user scrolling up to read earlier messages
  - ResizeObserver for detecting content height changes
  - Smooth scroll behavior
  - Empty state placeholder
  - Visual separator between turns (optional)
- Dependencies: Step 2.6
- Risk: Low

```typescript
import { useEffect, useRef, useCallback } from 'react'
import type { UIMessage } from '@/hooks/useChat'
import { MessageItem } from './MessageItem'
import { LoadingIndicator } from './LoadingIndicator'
import { Sparkles } from 'lucide-react'

const SCROLL_THRESHOLD = 100  // px from bottom to consider "near bottom"

interface MessageListProps {
  messages: UIMessage[]
  isStreaming: boolean
  onTodoUpdate?: () => void
}

export function MessageList({ messages, isStreaming, onTodoUpdate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)  // Track if user is near bottom

  // Check if user is near bottom of scroll container
  const checkIsNearBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom <= SCROLL_THRESHOLD
  }, [])

  // Update isNearBottom when user scrolls
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      isNearBottomRef.current = checkIsNearBottom()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [checkIsNearBottom])

  // Smart auto-scroll using ResizeObserver with isNearBottom check
  // Only scrolls if user is near bottom - won't interrupt scrolling up to read
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const observer = new ResizeObserver(() => {
      // Only auto-scroll if user is near bottom
      if (isNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    })

    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  // When new message is added, scroll to bottom if near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // When streaming starts, ensure we're at bottom and track it
  useEffect(() => {
    if (isStreaming) {
      // Reset to near-bottom when streaming starts
      isNearBottomRef.current = true
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isStreaming])

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div ref={contentRef} className="max-w-3xl mx-auto px-4 divide-y divide-gray-100">
          {messages.map(msg => (
            <MessageItem
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && msg.role === 'assistant' && !msg.content}
              onTodoUpdate={onTodoUpdate}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
      <Sparkles className="h-12 w-12 mb-4 text-gray-300" />
      <h2 className="text-lg font-medium mb-2">How can I help you today?</h2>
      <p className="text-sm text-gray-400">Ask me to create, update, or search your todos.</p>
    </div>
  )
}
```

**Smart Auto-Scroll Behavior:**

1. **`isNearBottomRef` tracking:** A ref (not state, to avoid re-renders) tracks whether the user is within 100px of the bottom.

2. **Scroll event listener:** Updates `isNearBottomRef` on every scroll. Uses `{ passive: true }` for performance.

3. **ResizeObserver with guard:** Only calls `scrollIntoView()` if `isNearBottomRef.current` is `true`. This prevents interrupting users who scrolled up to read earlier messages.

4. **Streaming starts:** Resets `isNearBottomRef` to `true` and scrolls to bottom, ensuring new AI responses are visible.

5. **New message added:** Only scrolls if user was already near bottom.

---

### Phase 3: Input & Page Layout - 2-3 hours

#### Step 3.1: Create ChatInput Component
**File:** `packages/frontend/src/features/chat/ChatInput.tsx`

- Action: Create auto-expanding textarea with **Stop button** support
- Features:
  - Auto-expand up to 5 lines (max-height: 120px)
  - Enter to send, Shift+Enter for newline
  - **IME-aware: `e.nativeEvent.isComposing` check prevents premature send during CJK input**
  - **Input NOT disabled during streaming**
  - **Dynamic button: Send → Stop during streaming**
  - Focus management and keyboard accessibility
- Dependencies: None
- Risk: Low

```typescript
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_TEXTAREA_HEIGHT = 120  // ~5 lines at 24px line-height
const MIN_TEXTAREA_HEIGHT = 40   // Single line

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isStreaming?: boolean
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto'

    // Calculate new height, capped at MAX
    const newHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)
    textarea.style.height = `${Math.max(newHeight, MIN_TEXTAREA_HEIGHT)}px`

    // Enable scroll when content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
  }, [])

  // Adjust height when value changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [value, adjustTextareaHeight])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // CRITICAL: Check for IME composition state (CJK input: Chinese, Japanese, Korean)
    // Without this check, pressing Enter during IME composition sends the message
    // instead of confirming the composition candidate
    if (e.nativeEvent.isComposing) {
      return  // Let IME handle the key event
    }

    // Enter without Shift = Send (only if not streaming and has content)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming && value.trim() && !disabled) {
        handleSubmit()
      }
    }
    // Enter with Shift = newline (default behavior, do nothing)
  }

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (trimmed) {
      onSend(trimmed)
      setValue('')
      // Reset textarea height after sending
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = `${MIN_TEXTAREA_HEIGHT}px`
        }
      })
    }
  }

  const handleButtonClick = () => {
    if (isStreaming) {
      onStop?.()
    } else {
      handleSubmit()
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          {/* Auto-expanding textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? "AI is responding..." : placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5",
                "text-gray-900 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "transition-all duration-150 ease-out",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{
                height: MIN_TEXTAREA_HEIGHT,
                maxHeight: MAX_TEXTAREA_HEIGHT,
              }}
            />
          </div>

          {/* Dynamic Send/Stop button */}
          <Button
            type="button"
            onClick={handleButtonClick}
            disabled={!isStreaming && !canSend}
            size="icon"
            variant={isStreaming ? "destructive" : "default"}
            className={cn(
              "shrink-0 rounded-xl h-10 w-10",
              "transition-all duration-150 ease-out",
              isStreaming && "animate-pulse"
            )}
            title={isStreaming ? "Stop generation" : "Send message"}
            aria-label={isStreaming ? "Stop generation" : "Send message"}
          >
            {isStreaming ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Keyboard hint */}
        <p className="text-xs text-gray-400 mt-2 text-center">
          {isStreaming ? (
            <span className="flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating... Click <Square className="h-3 w-3 inline" /> to stop
            </span>
          ) : (
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd>
              {" "}to send,{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Shift+Enter</kbd>
              {" "}for new line
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
```

**Key Implementation Details:**

1. **IME Composition Handling (Critical for CJK users):**
   - `e.nativeEvent.isComposing` is `true` during IME composition (typing Chinese, Japanese, Korean)
   - Without this check, pressing Enter to confirm an IME candidate would prematurely send the message
   - We return early during composition to let the IME handle the key event normally

2. **Dynamic Button States:**
   - **Idle + empty:** Button disabled (grayed out)
   - **Idle + Has content:** Send button (blue, enabled)
   - **Streaming:** Stop button (red, pulsing animation)

3. **Textarea Auto-Expansion:**
   - Starts at single line (40px)
   - Grows with content up to 5 lines (120px)
   - Shows scrollbar when content exceeds max height
   - Resets to single line after sending

4. **Keyboard Handling:**
   - `Enter` sends message (when not streaming and NOT composing)
   - `Shift+Enter` adds newline
   - `Enter` during streaming does nothing (user can type ahead)

5. **Accessibility:**
   - Proper `aria-label` on button
   - Focus management on mount
   - Keyboard hints for discoverability

#### Step 3.2: Create ChatPage Component
**File:** `packages/frontend/src/features/chat/ChatPage.tsx`

- Action: Create main page layout
- Layout: `flex flex-col h-screen`, max-w-3xl centered
- Dependencies: Steps 2.7, 3.1
- Risk: Low

```typescript
export function ChatPage() {
  const { messages, isStreaming, sendMessage, stopGeneration, clearSession } = useChat()

  const handleTodoUpdate = useCallback(() => {
    // Optionally refresh todo list or show toast
  }, [])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSession}
              className="text-gray-500"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </header>

      {/* Messages */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        onTodoUpdate={handleTodoUpdate}
      />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isStreaming={isStreaming}
        placeholder="Ask me to create, update, or search todos..."
      />
    </div>
  )
}
```

#### Step 3.3: Create Feature Index
**File:** `packages/frontend/src/features/chat/index.ts`

- Action: Export public API
- Dependencies: Step 3.2
- Risk: Low

```typescript
export { ChatPage } from './ChatPage'
export { MessageList } from './MessageList'
export { MessageItem } from './MessageItem'
export { ChatInput } from './ChatInput'
export { ToolCallAccordion } from './ToolCallAccordion'
export { ToolStatusBadge } from './ToolStatusBadge'
export { LoadingIndicator } from './LoadingIndicator'
export { MarkdownRenderer } from './MarkdownRenderer'
export { TodoCardWidget } from './TodoCardWidget'
```

---

### Phase 4: Integration - 1-2 hours

#### Step 4.1: Add Route to App.tsx
**File:** `packages/frontend/src/App.tsx`

- Action: Add `/chat` route
- Dependencies: Step 3.3
- Risk: Low

```typescript
import { ChatPage } from '@/features/chat'

// Inside <Routes>
<Route path="chat" element={<ChatPage />} />
```

#### Step 4.2: Add Navigation Entry
**File:** `packages/frontend/src/components/layout/MainLayout.tsx`

- Action: Add Chat nav item with icon (MessageCircle or Sparkles)
- Dependencies: None
- Risk: Low

```typescript
import { MessageCircle } from 'lucide-react'

// Inside <nav>
<NavItem
  icon={<MessageCircle className="h-5 w-5" />}
  label="Chat"
  path="/chat"
  expanded={sidebarExpanded}
/>
```

#### Step 4.3: Create Page Export
**File:** `packages/frontend/src/pages/ChatPage.tsx`

- Action: Re-export from features
- Dependencies: Step 3.3
- Risk: Low

```typescript
export { ChatPage } from '@/features/chat'
```

#### Step 4.4: Update Pages Index
**File:** `packages/frontend/src/pages/index.ts`

- Action: Export ChatPage
- Dependencies: Step 4.3
- Risk: Low

---

### Phase 5: Testing - 2-3 hours

#### Step 5.1: Unit Tests for useChat Hook
**File:** `packages/frontend/src/hooks/useChat.test.ts`

- Test Cases:
  - sendMessage adds user message to history
  - SSE events update state correctly
  - Tool call status updates
  - Abort controller cleanup
  - Error handling
  - **Session storage backup and restore**
  - **Stop generation aborts SSE**
  - **StreamingBuffer batches chunks correctly**
  - **flatMap aggregation of todos from multiple tool calls**

#### Step 5.2: Unit Tests for ChatInput
**File:** `packages/frontend/src/features/chat/__tests__/ChatInput.test.tsx`

- Test Cases:
  - Enter key sends message
  - Shift+Enter adds newline
  - **IME composing: Enter does NOT send (e.nativeEvent.isComposing = true)**
  - **Input NOT disabled during streaming**
  - **Stop button appears during streaming**
  - **Stop button calls onStop**
  - Auto-expand behavior

#### Step 5.3: Unit Tests for MessageList
**File:** `packages/frontend/src/features/chat/__tests__/MessageList.test.tsx`

- Test Cases:
  - Renders messages correctly
  - Auto-scroll on new message when near bottom
  - **No auto-scroll when user scrolled up (isNearBottom = false)**
  - Empty state display
  - **Document flow layout (all left-aligned)**

#### Step 5.4: Unit Tests for MarkdownRenderer
**File:** `packages/frontend/src/features/chat/__tests__/MarkdownRenderer.test.tsx`

- Test Cases:
  - Renders markdown correctly
  - **Component Property Filtering: skips task items with matching todoIds**
  - **Nested lists handled correctly (regex would fail)**
  - Links open in new tab
  - Interactive checkboxes work

#### Step 5.5: Component Tests for ChatPage
**File:** `packages/frontend/src/features/chat/__tests__/ChatPage.test.tsx`

- Test Cases:
  - Page renders correctly
  - User can send message
  - **Session recovered from sessionStorage**
  - **Clear button removes messages and storage**

---

## 5. Dependencies

### 5.1 New Dependencies

| Package | Purpose | Install Command |
|---------|---------|-----------------|
| `react-markdown` | Markdown rendering for AI messages | `pnpm --filter @nanomail/frontend add react-markdown` |
| `remark-gfm` | GitHub Flavored Markdown (task lists, tables) | `pnpm --filter @nanomail/frontend add remark-gfm` |

**Install both at once:**
```bash
pnpm --filter @nanomail/frontend add react-markdown remark-gfm
```

**Note:** `eventsource-parser` is already installed (v3.0.6).

### 5.2 Internal Dependencies

| Module | Usage |
|--------|-------|
| `@nanomail/shared` | `ChatMessage`, `ChatRequest`, `ChatContext`, `Todo` types |
| `@/components/ui/button` | Send/Stop buttons |
| `@/lib/utils` | `cn` utility |
| `lucide-react` | Icons (Send, Square, User, Sparkles, Loader2, Check, X, Settings, ChevronDown, CheckSquare, Trash2) |

---

## 6. Testing Strategy

### 6.1 Unit Tests

| Module | Test Cases | Priority |
|--------|------------|----------|
| `useChat` | Message state, SSE handling, abort, errors, session storage, **StreamingBuffer batching**, **flatMap todo aggregation** | High |
| `ChatInput` | Keyboard handling, **IME composition check**, Stop button, auto-expand | High |
| `MessageList` | Render, **smart scroll with isNearBottom**, empty state, document flow layout | High |
| `MarkdownRenderer` | Markdown rendering, **Component Property Filtering for task items**, nested lists | High |
| `MessageItem` | Document flow rendering, tool accordion, **todo extraction** | Medium |
| `ToolCallAccordion` | Collapse/expand, summary display | Medium |
| `TodoCardWidget` | Checkbox toggle, API call | Medium |
| `ToolStatusBadge` | Status icons, messages | Low |
| `LoadingIndicator` | Animation presence | Low |

### 6.2 Integration Tests

| Scenario | Steps |
|----------|-------|
| Full conversation flow | Send message -> receive SSE events -> display response |
| Stop generation | Send message -> click Stop -> verify abort called |
| Session recovery | Send messages -> refresh page -> messages restored |
| Tool call feedback | Send message -> tool_call_start -> tool_call_end -> accordion updates |
| Interactive todo | AI returns todo data -> click checkbox -> API called |
| Error handling | API error -> error state -> toast notification |
| **IME input** | Type with IME composing -> Enter confirms composition, doesn't send |
| **Smart scroll** | Scroll up -> receive message -> no auto-scroll; scroll to bottom -> receive message -> auto-scroll |
| **Multiple tool todos** | AI calls 2 tools returning todos -> widget shows all todos from both |

### 6.3 E2E Tests (Optional)

| Flow | Steps |
|------|-------|
| Create todo via chat | Open /chat -> type "明天下午3点开会" -> verify tool_call_end -> verify toast |
| Multi-turn conversation | Create todo -> update todo -> verify context maintained |
| Stop generation | Start message -> click Stop -> verify partial response preserved |

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSE connection drops mid-stream | User sees incomplete response | Add reconnection logic with last message ID |
| Large message history | Performance degradation | Implement virtualization or pagination for long conversations |
| Tool output too large | UI overflow | Truncate tool output display, show "..." with expand option |
| Markdown XSS | Security vulnerability | Use `react-markdown` with `disallowedElements` for dangerous tags |
| Memory leak from unclosed SSE | Browser memory growth | Ensure AbortController cleanup in useEffect return |
| Time zone issues | Wrong timestamps | Use `Intl.DateTimeFormat` with user's timezone |
| Session storage quota | Lost messages on large history | **Data pruning:** Strip `input`/`output` from `toolCalls` before saving. Reduces storage by 70-90%. Try/catch as fallback. |
| Duplicate todo checkboxes | User confusion on which to click | **Component Property Filtering:** Use react-markdown's `components` prop to intercept and filter task list items at render time, not regex. |
| Auto-scroll interrupts reading | User annoyed when scrolled away | **Smart auto-scroll with isNearBottom:** Only scroll if user is within 100px of bottom. Track scroll position and respect user intent. |
| IME sends prematurely | CJK users can't type properly | **e.nativeEvent.isComposing check:** Detect IME composition state and ignore Enter during composition. |
| High CPU during streaming | UI jank, poor UX | **StreamingBuffer with RAF:** Batch React updates to animation frames. Limits re-renders to 60fps max. |
| Missing todos from multiple tools | Incomplete todo widget | **flatMap aggregation:** Extract todos from ALL tool calls, not just the first one. |

---

## 8. Success Criteria

- [ ] User can navigate to `/chat` from sidebar
- [ ] Page displays empty state with input placeholder
- [ ] User can type message and send with Enter key
- [ ] **Messages use document flow layout (all left-aligned, no bubbles)**
- [ ] SSE events display loading indicator (blinking cursor or pulsing icon)
- [ ] **Tool calls are collapsible in accordion**
- [ ] AI response renders with Markdown support
- [ ] **User can stop generation with Stop button**
- [ ] **Messages persist in sessionStorage and recover on refresh**
- [ ] **Smart auto-scroll: scrolls when near bottom, doesn't interrupt when scrolled up**
- [ ] **Input remains enabled during streaming**
- [ ] **IME input works correctly (Enter during composition doesn't send)**
- [ ] **No duplicate todo checkboxes (AST-based filtering works)**
- [ ] **Multiple tool calls aggregate todos correctly (flatMap)**
- [ ] **Streaming is smooth without UI jank (RAF batching)**
- [ ] Shift+Enter creates newline in input
- [ ] All unit tests pass with 80%+ coverage
- [ ] No console errors during normal usage

---

## 9. Future Enhancements

- **Conversation persistence to database**: Save conversations server-side for multi-device access
- **Code block highlighting**: Add syntax highlighting for code snippets
- **Voice input**: Speech-to-text for hands-free interaction
- **Conversation history**: Browse past conversations
- **Export chat**: Download conversation as Markdown
- **Multi-modal**: Image attachments for context
- **Streaming indicators**: Show typing animation for each token

---

## 10. Implementation Order Summary

```
Phase 1: Foundation (Service & Hook)
  1.1 Create ChatService (chat.service.ts)
  1.2 Update services/index.ts
  1.3 Create useChat hook (with session storage, StreamingBuffer for performance)

Phase 2: Core UI Components
  2.1 LoadingIndicator (blinking cursor)
  2.2 ToolCallAccordion
  2.3 ToolStatusBadge
  2.4 MarkdownRenderer (Component Property Filtering)
  2.5 TodoCardWidget
  2.6 MessageItem (document flow layout, flatMap todo extraction)
  2.7 MessageList (smart auto-scroll with isNearBottom)

Phase 3: Input & Page Layout
  3.1 ChatInput (IME-aware with isComposing check, Stop button)
  3.2 ChatPage
  3.3 Feature index.ts

Phase 4: Integration
  4.1 Add route to App.tsx
  4.2 Add nav item to MainLayout
  4.3 Create page export
  4.4 Update pages index.ts

Phase 5: Testing
  5.1 useChat tests (StreamingBuffer, flatMap aggregation, session storage)
  5.2 ChatInput tests (IME check, Stop button)
  5.3 MessageList tests (smart scroll behavior)
  5.4 MarkdownRenderer tests (AST filtering)
  5.5 ChatPage tests
```

**Estimated Total Time:** 14-19 hours (increased due to additional test coverage)
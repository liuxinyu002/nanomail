# Phase 2: Core UI Components

> Frontend Chat Page Implementation - Phase 2 of 5
> Estimated Time: 4-5 hours
> **Status: ✅ COMPLETED** (2026-03-22)

---

## Implementation Notes

### Actual vs Planned Differences

| Item | Plan (Original) | Actual Implementation |
|------|-----------------|----------------------|
| ToolStatusBadge props | Custom `ToolStatusBadgeProps` interface | Uses `ToolCallStatus` type directly |
| TodoCardWidget field | `todo.title`, `todo.completed` | `todo.description`, `todo.status` |
| handleToggle param | `currentStatus: boolean` | `currentStatus: TodoStatus` |

### Key Implementation Decisions

1. **Type Reuse**: `ToolStatusBadge` uses `ToolCallStatus` from `useChat` hook instead of defining a separate interface, ensuring type consistency.

2. **Todo Schema Compliance**: `TodoCardWidget` correctly uses `status` (enum) and `description` fields per `@nanomail/shared` schema, not the legacy `completed` boolean.

---

## Context Summary

### Project Goal
Implement a frontend Chat Page that provides a conversational interface for AI-assisted todo management.

### Scope (This Phase)
| Module | Change Type | Description |
|--------|-------------|-------------|
| LoadingIndicator | New | Blinking cursor or pulsing icon |
| ToolCallAccordion | New | Collapsible container for multiple tool calls |
| ToolStatusBadge | New | Status indicator for tool calls |
| MarkdownRenderer | New | Markdown with interactive components |
| TodoCardWidget | New | Interactive todo list card |
| MessageItem | New | Single message with document flow layout |
| MessageList | New | Scrollable message container with smart auto-scroll |

### Key Design Decisions
- **Document Flow Layout**: All messages left-aligned, no bubbles, avatar + label for role distinction
- **Tool Call Accordion**: Auto-expands while pending, auto-collapses 800ms after completion
- **Component Property Filtering**: Use react-markdown's `components` prop to filter duplicate task lists
- **Smart Auto-Scroll**: Only scrolls if user is within 100px of bottom
- **Todo Extraction**: Uses flatMap to aggregate todos from multiple tool calls

### UI Layout Principles (Document Flow)

**Why Document Flow over Chat Bubbles:**
1. Better Markdown Rendering for tables, long lists, and code blocks
2. Improved Readability - no left-right eye movement
3. Professional AI Experience - matches ChatGPT, Claude

**Layout Rules:**
| Element | Style |
|---------|-------|
| Message alignment | All messages left-aligned (flush left) |
| Background | No message background color (no bubbles) |
| Role distinction | Avatar + label ("You" / "AI Assistant") at message header |
| Width | Full `max-w-3xl` for rich content |
| Spacing | Adequate margin between message turns |

---

## Implementation Steps

### Step 2.1: Create LoadingIndicator Component

**File:** `packages/frontend/src/features/chat/LoadingIndicator.tsx`

**Action:** Create modern loading indicator (blinking cursor)

**Design:** Per `docs/SPEC/design-system.md` - 150ms ease-out fade-in

**Dependencies:** None

**Risk:** Low

```typescript
/**
 * LoadingIndicator - Blinking cursor for AI text generation
 *
 * Design Decision: Use blinking cursor instead of bouncing dots
 * to match the AI text generation feel.
 */
export function LoadingIndicator() {
  return (
    <span
      className="inline-block w-2 h-5 bg-gray-800 animate-pulse"
      aria-label="AI is thinking"
    />
  )
}

/**
 * Alternative: Pulsing AI icon with text
 */
export function LoadingIndicatorIcon() {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Sparkles className="h-4 w-4 animate-pulse" />
      <span className="text-sm">Thinking...</span>
    </div>
  )
}
```

---

### Step 2.2: Create ToolStatusBadge Component

**File:** `packages/frontend/src/features/chat/ToolStatusBadge.tsx`

**Action:** Create inline status indicator for tool calls

**States:** `pending` (spinning), `success` (checkmark), `error` (X)

**Dependencies:** `@/hooks/useChat` - `ToolCallStatus` type

**Risk:** Low

```typescript
import { Loader2, Check, X } from 'lucide-react'
import type { ToolCallStatus } from '@/hooks/useChat'

/**
 * ToolStatusBadge - Inline status indicator for tool calls
 *
 * States:
 * - pending: Spinning loader with ellipsis
 * - success: Green checkmark
 * - error: Red X icon
 *
 * Note: Uses ToolCallStatus type from useChat hook instead of separate interface.
 * This ensures type consistency across the chat feature.
 */
export function ToolStatusBadge({ toolName, status, message }: ToolCallStatus) {
  const icons = {
    pending: <Loader2 className="h-3 w-3 animate-spin text-gray-500" />,
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

---

### Step 2.3: Create ToolCallAccordion Component

**File:** `packages/frontend/src/features/chat/ToolCallAccordion.tsx`

**Action:** Create collapsible container for multiple tool calls

**Purpose:** Reduce visual noise when AI performs multiple actions

**Features:**
- Collapsed: Show summary (`⚙️ Performed 3 actions`)
- Expanded: Show individual ToolStatusBadge components
- Auto-expand while any tool is pending
- Auto-collapse when all tools complete (800ms delay)

**Dependencies:** Step 2.2 (ToolStatusBadge)

**Risk:** Low

```typescript
import { useState, useEffect } from 'react'
import { Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolStatusBadge } from './ToolStatusBadge'
import type { ToolCallStatus } from '@/hooks/useChat'

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

---

### Step 2.4: Create MarkdownRenderer Component

**File:** `packages/frontend/src/features/chat/MarkdownRenderer.tsx`

**Action:** Create markdown-to-React renderer with interactive components

**Features:**
- GFM support (task lists, tables, strikethrough) via `remark-gfm`
- Component Property Filtering: Use react-markdown's `components` prop to intercept and filter duplicate task lists
- Links open in new tab
- Safe HTML rendering (no XSS)

**Dependencies:** None

**Risk:** Medium - Component filtering logic

```typescript
import React from 'react'
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
        const textContent = extractTextContent(children)
        if (shouldSkipTaskItem(textContent)) {
          return null // Skip rendering this list item entirely
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

---

### Step 2.5: Create TodoCardWidget Component

**File:** `packages/frontend/src/features/chat/TodoCardWidget.tsx`

**Action:** Create interactive todo card for structured tool output

**Purpose:** Provide truly interactive todo list when AI performs todo operations

**Features:**
- Display todo items with real checkboxes
- Checkbox clicks trigger API to update status
- Show due dates, priorities

**Dependencies:**
- `@/services/todo.service` - Todo API calls
- `@nanomail/shared` - `Todo`, `TodoStatus` types

**Risk:** Medium

**Important:** The Todo schema uses `status` (enum: 'pending' | 'in_progress' | 'completed') and `description` (not `title` or `completed` boolean). See `packages/shared/src/schemas/todo.ts`.

```typescript
import { useState } from 'react'
import { CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { todoService } from '@/services/todo.service'
import type { Todo, TodoStatus } from '@nanomail/shared'

interface TodoCardWidgetProps {
  todos: Todo[]
  onUpdate?: () => void
}

export function TodoCardWidget({ todos, onUpdate }: TodoCardWidgetProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Toggle todo status between 'completed' and 'pending'
  const handleToggle = async (todoId: string, currentStatus: TodoStatus) => {
    const newStatus: TodoStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    setUpdatingId(todoId)
    try {
      await todoService.update(todoId, { status: newStatus })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update todo:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
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
              checked={todo.status === 'completed'}
              onChange={() => handleToggle(String(todo.id), todo.status)}
              disabled={updatingId === String(todo.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={cn(
              "flex-1 text-sm",
              todo.status === 'completed' && "line-through text-gray-400"
            )}>
              {todo.description}
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

---

### Step 2.6: Create MessageItem Component

**File:** `packages/frontend/src/features/chat/MessageItem.tsx`

**Action:** Create message component with document flow layout

**Design:** No bubbles, all left-aligned, avatar + label for distinction

**Dependencies:** Steps 2.1, 2.3, 2.4, 2.5

**Risk:** Low

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
  const todosFromToolCalls = useMemo(
    () => extractTodosFromToolCalls(message.toolCalls),
    [message.toolCalls]
  )
  const hasStructuredTodoWidget = todosFromToolCalls.length > 0

  // Create Set of todo IDs for MarkdownRenderer deduplication
  const todoIds = useMemo(
    () => new Set(todosFromToolCalls.map(t => String(t.id))),
    [todosFromToolCalls]
  )

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

/**
 * Helper to extract todos from tool call output.
 * Uses flatMap to aggregate todos from ALL tool calls, not just the first one.
 *
 * CRITICAL: Previously this used a for-loop that returned on first match,
 * missing todos from subsequent tool calls in the same message.
 */
function extractTodosFromToolCalls(toolCalls?: ToolCallStatus[]): Todo[] {
  if (!toolCalls) return []

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

---

### Step 2.7: Create MessageList Component

**File:** `packages/frontend/src/features/chat/MessageList.tsx`

**Action:** Create scrollable message container with smart auto-scroll

**Features:**
- Smart auto-scroll with `isNearBottom` detection
- Only auto-scrolls if user is near bottom (within 100px threshold)
- ResizeObserver for detecting content height changes
- Empty state placeholder

**Dependencies:** Step 2.6

**Risk:** Low

```typescript
import { useEffect, useRef, useCallback } from 'react'
import type { UIMessage } from '@/hooks/useChat'
import { MessageItem } from './MessageItem'
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

  // When streaming starts, ensure we're at bottom
  useEffect(() => {
    if (isStreaming) {
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
    <div className="flex-1 flex flex-col items-center justify-center h-full text-gray-500">
      <Sparkles className="h-12 w-12 mb-4 text-gray-300" />
      <h2 className="text-lg font-medium mb-2">How can I help you today?</h2>
      <p className="text-sm text-gray-400">Ask me to create, update, or search your todos.</p>
    </div>
  )
}
```

---

## Acceptance Criteria

- [x] `LoadingIndicator` shows blinking cursor
- [x] `ToolStatusBadge` displays correct icon per status
- [x] `ToolCallAccordion` auto-expands when pending, auto-collapses after completion
- [x] `MarkdownRenderer` renders GFM with Component Property Filtering for task items
- [x] `TodoCardWidget` displays todos with interactive checkboxes
- [x] `MessageItem` uses document flow layout (all left-aligned)
- [x] `MessageItem` extracts todos from ALL tool calls (flatMap)
- [x] `MessageList` auto-scrolls only when user is near bottom
- [x] `MessageList` shows empty state when no messages

---

## Dependencies

### New Packages
```bash
pnpm --filter @nanomail/frontend add react-markdown remark-gfm
```

### Existing
- `@nanomail/shared` - `Todo`, `TodoStatus` types
- `@/services/todo.service` - Todo API calls
- `@/hooks/useChat` - `UIMessage`, `ToolCallStatus` types
- `lucide-react` - Icons

### Type Dependencies

| Component | Imported Types |
|-----------|---------------|
| ToolStatusBadge | `ToolCallStatus` from `@/hooks/useChat` |
| ToolCallAccordion | `ToolCallStatus` from `@/hooks/useChat` |
| MessageItem | `UIMessage`, `ToolCallStatus` from `@/hooks/useChat`; `Todo` from `@nanomail/shared` |
| MessageList | `UIMessage` from `@/hooks/useChat` |
| TodoCardWidget | `Todo`, `TodoStatus` from `@nanomail/shared` |

### File Structure After This Phase
```
packages/frontend/src/features/chat/
├── index.ts                 # Barrel exports
├── LoadingIndicator.tsx     # NEW
├── ToolStatusBadge.tsx      # NEW
├── ToolCallAccordion.tsx    # NEW
├── MarkdownRenderer.tsx     # NEW
├── TodoCardWidget.tsx       # NEW
├── MessageItem.tsx          # NEW
└── MessageList.tsx          # NEW
```

---

## Next Phase

→ [Phase 3: Input & Page Layout](./plan_2_phase3.md)

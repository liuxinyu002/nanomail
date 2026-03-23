# Phase 3: Input & Page Layout

> Frontend Chat Page Implementation - Phase 3 of 5
> Estimated Time: 2-3 hours

---

## Context Summary

### Project Goal
Implement a frontend Chat Page that provides a conversational interface for AI-assisted todo management.

### Scope (This Phase)
| Module | Change Type | Description |
|--------|-------------|-------------|
| ChatInput | New | Auto-expanding textarea with Stop button |
| ChatPage | New | Main page layout with header, messages, input |
| Feature Index | New | Public exports from chat feature |

### Key Design Decisions
- **Auto-expanding Textarea**: Grows up to 5 lines, shows scrollbar beyond
- **IME Support**: `e.nativeEvent.isComposing` check prevents premature send during CJK input
- **Dynamic Button**: Send → Stop during streaming
- **Input NOT disabled during streaming**: Users can type ahead

### Layout Structure
```
┌──────────────────────────────────────┐
│ Header: AI Assistant | Clear Button  │
├──────────────────────────────────────┤
│                                      │
│         MessageList                  │
│         (flex-1, scrollable)         │
│                                      │
├──────────────────────────────────────┤
│         ChatInput                    │
│         (fixed at bottom)            │
└──────────────────────────────────────┘
```

---

## Implementation Steps

### Step 3.1: Create ChatInput Component

**File:** `packages/frontend/src/features/chat/ChatInput.tsx`

**Action:** Create auto-expanding textarea with Stop button support

**Features:**
- Auto-expand up to 5 lines (max-height: 120px)
- Enter to send, Shift+Enter for newline
- IME-aware: `e.nativeEvent.isComposing` check prevents premature send during CJK input
- Input NOT disabled during streaming
- Dynamic button: Send → Stop during streaming
- Focus management and keyboard accessibility

**Dependencies:** None

**Risk:** Low

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
   - `e.nativeEvent.isComposing` is `true` during IME composition
   - Without this check, pressing Enter to confirm an IME candidate would prematurely send the message

2. **Dynamic Button States:**
   - Idle + empty: Button disabled (grayed out)
   - Idle + Has content: Send button (blue, enabled)
   - Streaming: Stop button (red, pulsing animation)

3. **Textarea Auto-Expansion:**
   - Starts at single line (40px)
   - Grows with content up to 5 lines (120px)
   - Shows scrollbar when content exceeds max height

---

### Step 3.2: Create ChatPage Component

**File:** `packages/frontend/src/features/chat/ChatPage.tsx`

**Action:** Create main page layout

**Layout:** `flex flex-col h-screen`, max-w-3xl centered

**Dependencies:** Phase 1 (useChat), Phase 2 (MessageList), Step 3.1 (ChatInput)

**Risk:** Low

```typescript
import { useCallback } from 'react'
import { Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export function ChatPage() {
  const { messages, isStreaming, sendMessage, stopGeneration, clearSession } = useChat()

  const handleTodoUpdate = useCallback(() => {
    // Optionally refresh todo list or show toast
    console.log('Todo updated')
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

---

### Step 3.3: Create Feature Index

**File:** `packages/frontend/src/features/chat/index.ts`

**Action:** Export public API

**Dependencies:** All previous steps

**Risk:** Low

```typescript
// Page
export { ChatPage } from './ChatPage'

// Components
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

## Acceptance Criteria

- [ ] `ChatInput` auto-expands up to 5 lines
- [ ] `ChatInput` sends message on Enter (when not composing)
- [ ] `ChatInput` adds newline on Shift+Enter
- [ ] `ChatInput` IME composing check prevents premature send
- [ ] `ChatInput` shows Stop button during streaming
- [ ] `ChatInput` remains enabled during streaming
- [ ] `ChatPage` displays header with title and clear button
- [ ] `ChatPage` integrates MessageList and ChatInput
- [ ] Feature index exports all components

---

## Dependencies

### Existing
- `@/components/ui/button` - Button component
- `@/hooks/useChat` - Chat state management
- `lucide-react` - Icons

### File Structure After This Phase
```
packages/frontend/src/features/chat/
├── index.ts                 # NEW
├── ChatPage.tsx             # NEW
├── ChatInput.tsx            # NEW
├── MessageList.tsx          # (Phase 2)
├── MessageItem.tsx          # (Phase 2)
├── ToolCallAccordion.tsx    # (Phase 2)
├── ToolStatusBadge.tsx      # (Phase 2)
├── LoadingIndicator.tsx     # (Phase 2)
├── MarkdownRenderer.tsx     # (Phase 2)
└── TodoCardWidget.tsx       # (Phase 2)
```

---

## Next Phase

→ [Phase 4: Integration](./plan_2_phase4.md)

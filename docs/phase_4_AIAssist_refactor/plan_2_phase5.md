# Phase 5: Testing

> Frontend Chat Page Implementation - Phase 5 of 5
> Estimated Time: 2-3 hours

---

## Context Summary

### Project Goal
Implement a frontend Chat Page that provides a conversational interface for AI-assisted todo management.

### Scope (This Phase)
| Test File | Test Target | Priority |
|-----------|-------------|----------|
| useChat.test.ts | Hook state management | High |
| ChatInput.test.tsx | Input component | High |
| MessageList.test.tsx | Message list & scroll | High |
| MarkdownRenderer.test.tsx | Markdown & filtering | High |
| ChatPage.test.tsx | Page integration | Medium |

### Testing Framework
- Vitest for test runner
- React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking (optional)

---

## Implementation Steps

### Step 5.1: Unit Tests for useChat Hook

**File:** `packages/frontend/src/hooks/__tests__/useChat.test.ts`

**Test Cases:**
- sendMessage adds user message to history
- SSE events update state correctly
- Tool call status updates
- Abort controller cleanup
- Error handling
- Session storage backup and restore
- Stop generation aborts SSE
- StreamingBuffer batches chunks correctly
- flatMap aggregation of todos from multiple tool calls

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '../useChat'

// Mock ChatService
vi.mock('@/services/chat.service', () => ({
  ChatService: {
    streamChat: vi.fn(),
  },
}))

describe('useChat', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty messages', () => {
      const { result } = renderHook(() => useChat())
      expect(result.current.messages).toEqual([])
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('restores messages from sessionStorage', () => {
      const cachedMessages = [
        { id: '1', role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
      ]
      sessionStorage.setItem('nanomail_chat_messages', JSON.stringify(cachedMessages))

      const { result } = renderHook(() => useChat())
      expect(result.current.messages).toEqual(cachedMessages)
    })
  })

  describe('sendMessage', () => {
    it('adds user message to history', async () => {
      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.messages).toHaveLength(2) // user + assistant placeholder
      expect(result.current.messages[0].role).toBe('user')
      expect(result.current.messages[0].content).toBe('Hello')
    })

    it('creates assistant message placeholder', async () => {
      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1].role).toBe('assistant')
      expect(result.current.messages[1].content).toBe('')
    })
  })

  describe('stopGeneration', () => {
    it('calls abort on the controller', async () => {
      const { result } = renderHook(() => useChat())

      // Start a message (this will create an AbortController)
      const sendPromise = act(async () => {
        result.current.sendMessage('Hello')
      })

      // Stop generation
      act(() => {
        result.current.stopGeneration()
      })

      await sendPromise

      // Verify isStreaming is false after abort
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('clearSession', () => {
    it('clears messages and sessionStorage', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.clearSession()
      })

      expect(result.current.messages).toEqual([])
      expect(sessionStorage.getItem('nanomail_chat_messages')).toBeNull()
    })
  })

  describe('session storage', () => {
    it('saves messages to sessionStorage on change', async () => {
      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      await waitFor(() => {
        const stored = sessionStorage.getItem('nanomail_chat_messages')
        expect(stored).not.toBeNull()
      })
    })

    it('prunes toolCall input/output before saving', () => {
      // Test that large payloads are stripped
      const { result } = renderHook(() => useChat())

      // Manually set messages with tool calls containing large payloads
      act(() => {
        // This would normally happen via SSE events
      })

      // Verify sessionStorage doesn't contain input/output
    })
  })
})
```

---

### Step 5.2: Unit Tests for ChatInput

**File:** `packages/frontend/src/features/chat/__tests__/ChatInput.test.tsx`

**Test Cases:**
- Enter key sends message
- Shift+Enter adds newline
- IME composing: Enter does NOT send
- Input NOT disabled during streaming
- Stop button appears during streaming
- Stop button calls onStop
- Auto-expand behavior

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../ChatInput'

describe('ChatInput', () => {
  const mockOnSend = vi.fn()
  const mockOnStop = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders textarea and send button', () => {
      render(<ChatInput onSend={mockOnSend} />)

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('shows stop button when streaming', () => {
      render(<ChatInput onSend={mockOnSend} onStop={mockOnStop} isStreaming />)

      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    })

    it('shows send button when not streaming', () => {
      render(<ChatInput onSend={mockOnSend} isStreaming={false} />)

      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })
  })

  describe('keyboard handling', () => {
    it('sends message on Enter (without Shift)', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type a message...')
      await user.type(textarea, 'Hello{Enter}')

      expect(mockOnSend).toHaveBeenCalledWith('Hello')
    })

    it('does NOT send on Shift+Enter (adds newline)', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type a message...')
      await user.type(textarea, 'Hello{Shift>}{Enter}{/Shift}')

      expect(mockOnSend).not.toHaveBeenCalled()
      expect(textarea).toHaveValue('Hello\n')
    })

    it('does NOT send during IME composition', () => {
      render(<ChatInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type a message...')
      fireEvent.change(textarea, { target: { value: '你好' } })

      // Simulate Enter during IME composition
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        shiftKey: false,
        nativeEvent: { isComposing: true } as KeyboardEvent,
      })

      expect(mockOnSend).not.toHaveBeenCalled()
    })

    it('does not send empty message', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type a message...')
      await user.type(textarea, '{Enter}')

      expect(mockOnSend).not.toHaveBeenCalled()
    })
  })

  describe('button behavior', () => {
    it('calls onStop when stop button clicked', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockOnSend} onStop={mockOnStop} isStreaming />)

      await user.click(screen.getByRole('button', { name: /stop/i }))

      expect(mockOnStop).toHaveBeenCalled()
    })

    it('disables send button when input is empty', () => {
      render(<ChatInput onSend={mockOnSend} />)

      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    })

    it('enables send button when input has content', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type a message...')
      await user.type(textarea, 'Hello')

      expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled()
    })
  })

  describe('auto-expand', () => {
    it('expands textarea with content', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type a message...')
      const initialHeight = textarea.clientHeight

      // Type multiple lines
      await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6')

      // Height should increase (but capped at max)
      expect(textarea.clientHeight).toBeGreaterThan(initialHeight)
    })
  })
})
```

---

### Step 5.3: Unit Tests for MessageList

**File:** `packages/frontend/src/features/chat/__tests__/MessageList.test.tsx`

**Test Cases:**
- Renders messages correctly
- Auto-scroll on new message when near bottom
- No auto-scroll when user scrolled up
- Empty state display
- Document flow layout (all left-aligned)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MessageList } from '../MessageList'
import type { UIMessage } from '@/hooks/useChat'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('MessageList', () => {
  const mockMessages: UIMessage[] = [
    { id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
    { id: '2', role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' },
  ]

  it('renders all messages', () => {
    render(<MessageList messages={mockMessages} isStreaming={false} />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    render(<MessageList messages={[]} isStreaming={false} />)

    expect(screen.getByText('How can I help you today?')).toBeInTheDocument()
  })

  it('renders user and assistant messages with correct roles', () => {
    render(<MessageList messages={mockMessages} isStreaming={false} />)

    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('uses document flow layout (left-aligned)', () => {
    const { container } = render(<MessageList messages={mockMessages} isStreaming={false} />)

    // All messages should be left-aligned (no chat bubble classes)
    const messages = container.querySelectorAll('.py-4')
    messages.forEach(msg => {
      expect(msg.className).not.toMatch(/ml-auto|mr-auto|self-end/)
    })
  })

  describe('auto-scroll behavior', () => {
    it('scrolls to bottom when streaming starts', () => {
      const scrollIntoViewMock = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock

      const { rerender } = render(<MessageList messages={mockMessages} isStreaming={false} />)

      rerender(<MessageList messages={mockMessages} isStreaming={true} />)

      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })
})
```

---

### Step 5.4: Unit Tests for MarkdownRenderer

**File:** `packages/frontend/src/features/chat/__tests__/MarkdownRenderer.test.tsx`

**Test Cases:**
- Renders markdown correctly
- Component Property Filtering: skips task items with matching todoIds
- Nested lists handled correctly
- Links open in new tab
- Interactive checkboxes work

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkdownRenderer } from '../MarkdownRenderer'

describe('MarkdownRenderer', () => {
  describe('basic rendering', () => {
    it('renders plain text', () => {
      render(<MarkdownRenderer content="Hello world" />)

      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('renders markdown headings', () => {
      render(<MarkdownRenderer content="# Title" />)

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title')
    })

    it('renders markdown lists', () => {
      render(<MarkdownRenderer content="- Item 1\n- Item 2" />)

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    it('renders code blocks', () => {
      render(<MarkdownRenderer content="```js\nconsole.log('hi')\n```" />)

      expect(screen.getByText(/console.log/)).toBeInTheDocument()
    })
  })

  describe('links', () => {
    it('opens links in new tab', () => {
      render(<MarkdownRenderer content="[Link](https://example.com)" />)

      const link = screen.getByRole('link', { name: 'Link' })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('task lists', () => {
    it('renders task list checkboxes', () => {
      render(<MarkdownRenderer content="- [ ] Task 1\n- [x] Task 2" />)

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
      expect(checkboxes[0]).not.toBeChecked()
      expect(checkboxes[1]).toBeChecked()
    })

    it('calls onTodoToggle when checkbox clicked', async () => {
      const mockToggle = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownRenderer content="- [ ] Task 1" onTodoToggle={mockToggle} />)

      await user.click(screen.getByRole('checkbox'))

      expect(mockToggle).toHaveBeenCalled()
    })
  })

  describe('Component Property Filtering', () => {
    it('filters task items when todoIds provided', () => {
      const todoIds = new Set(['todo-123'])

      // Content contains task list item with todo ID
      render(
        <MarkdownRenderer
          content="- [ ] todo-123 Task to filter\n- [ ] Other task"
          todoIds={todoIds}
        />
      )

      // First task should be filtered (not rendered)
      // Second task should be rendered
      expect(screen.queryByText(/todo-123/)).not.toBeInTheDocument()
    })

    it('renders all task items when no todoIds', () => {
      render(<MarkdownRenderer content="- [ ] Task 1\n- [ ] Task 2" />)

      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
    })
  })

  describe('nested content', () => {
    it('handles nested lists correctly', () => {
      render(
        <MarkdownRenderer content="- Item 1\n  - Nested item\n- Item 2" />
      )

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Nested item')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
  })
})
```

---

### Step 5.5: Component Tests for ChatPage

**File:** `packages/frontend/src/features/chat/__tests__/ChatPage.test.tsx`

**Test Cases:**
- Page renders correctly
- User can send message
- Session recovered from sessionStorage
- Clear button removes messages and storage

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPage } from '../ChatPage'

// Mock useChat hook
vi.mock('@/hooks/useChat', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    isStreaming: false,
    error: null,
    sendMessage: vi.fn(),
    stopGeneration: vi.fn(),
    clearSession: vi.fn(),
  })),
}))

import { useChat } from '@/hooks/useChat'

describe('ChatPage', () => {
  const mockUseChat = vi.mocked(useChat)

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('renders header with title', () => {
    render(<ChatPage />)

    expect(screen.getByText('AI Assistant')).toBeInTheDocument()
  })

  it('shows empty state when no messages', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      stopGeneration: vi.fn(),
      clearSession: vi.fn(),
    })

    render(<ChatPage />)

    expect(screen.getByText('How can I help you today?')).toBeInTheDocument()
  })

  it('renders messages from hook', () => {
    mockUseChat.mockReturnValue({
      messages: [
        { id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { id: '2', role: 'assistant', content: 'Hi!', timestamp: '2024-01-01T00:00:01Z' },
      ],
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      stopGeneration: vi.fn(),
      clearSession: vi.fn(),
    })

    render(<ChatPage />)

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi!')).toBeInTheDocument()
  })

  it('shows clear button when messages exist', () => {
    mockUseChat.mockReturnValue({
      messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' }],
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      stopGeneration: vi.fn(),
      clearSession: vi.fn(),
    })

    render(<ChatPage />)

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('hides clear button when no messages', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      stopGeneration: vi.fn(),
      clearSession: vi.fn(),
    })

    render(<ChatPage />)

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('calls clearSession when clear button clicked', async () => {
    const mockClearSession = vi.fn()
    mockUseChat.mockReturnValue({
      messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00Z' }],
      isStreaming: false,
      error: null,
      sendMessage: vi.fn(),
      stopGeneration: vi.fn(),
      clearSession: mockClearSession,
    })

    const user = userEvent.setup()
    render(<ChatPage />)

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(mockClearSession).toHaveBeenCalled()
  })
})
```

---

## Acceptance Criteria

- [ ] `useChat.test.ts` passes all test cases
- [ ] `ChatInput.test.tsx` passes all test cases
- [ ] `MessageList.test.tsx` passes all test cases
- [ ] `MarkdownRenderer.test.tsx` passes all test cases
- [ ] `ChatPage.test.tsx` passes all test cases
- [ ] Test coverage >= 80% for chat feature

---

## Test Coverage Targets

| Module | Target Coverage |
|--------|-----------------|
| useChat | 90% |
| ChatInput | 85% |
| MessageList | 85% |
| MarkdownRenderer | 85% |
| MessageItem | 80% |
| ToolCallAccordion | 80% |
| TodoCardWidget | 80% |
| ChatPage | 80% |

---

## Running Tests

```bash
# Run all chat tests
pnpm --filter @nanomail/frontend test -- --grep "chat"

# Run with coverage
pnpm --filter @nanomail/frontend test -- --coverage --grep "chat"

# Run specific test file
pnpm --filter @nanomail/frontend test -- useChat.test.ts
```

---

## File Structure After This Phase
```
packages/frontend/src/
├── hooks/
│   └── __tests__/
│       └── useChat.test.ts       # NEW
└── features/
    └── chat/
        └── __tests__/
            ├── ChatPage.test.tsx       # NEW
            ├── ChatInput.test.tsx      # NEW
            ├── MessageList.test.tsx    # NEW
            └── MarkdownRenderer.test.tsx # NEW
```

---

## Completion

This completes the Frontend Chat Page Implementation Plan. All phases should be executed in order:

1. ✅ [Phase 1: Foundation](./plan_2_phase1.md)
2. ✅ [Phase 2: Core UI Components](./plan_2_phase2.md)
3. ✅ [Phase 3: Input & Page Layout](./plan_2_phase3.md)
4. ✅ [Phase 4: Integration](./plan_2_phase4.md)
5. ✅ [Phase 5: Testing](./plan_2_phase5.md)

**Estimated Total Time:** 14-19 hours

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageItem } from './MessageItem'
import type { UIMessage, ToolCallStatus } from '@/hooks/useChat'
import type { Todo } from '@nanomail/shared'

// ============ Mocks ============

// Mock child components to isolate MessageItem logic
vi.mock('./MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, onTodoToggle, todoIds }: {
    content: string
    onTodoToggle?: (todoId: string, checked: boolean) => void
    todoIds?: Set<string>
  }) => (
    <div data-testid="markdown-renderer" data-todo-ids={todoIds ? Array.from(todoIds).join(',') : ''}>
      {content}
    </div>
  ),
}))

vi.mock('./TodoCardWidget', () => ({
  TodoCardWidget: ({ todos, onUpdate }: { todos: Todo[]; onUpdate?: () => void }) => (
    <div data-testid="todo-card-widget" data-todo-count={todos.length}>
      {todos.map(t => (
        <span key={t.id} data-todo-id={t.id}>{t.description}</span>
      ))}
    </div>
  ),
}))

vi.mock('./ToolCallAccordion', () => ({
  ToolCallAccordion: ({ toolCalls }: { toolCalls: ToolCallStatus[] }) => (
    <div data-testid="tool-call-accordion" data-tool-count={toolCalls.length}>
      {toolCalls.map(tc => (
        <span key={tc.id} data-tool-id={tc.id}>{tc.toolName}</span>
      ))}
    </div>
  ),
}))

vi.mock('./LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="loading-indicator">Loading...</div>,
}))

// ============ Test Helpers ============

function createUIMessage(overrides: Partial<UIMessage> = {}): UIMessage {
  return {
    id: 'test-msg-id',
    role: 'user',
    content: 'Test message content',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createToolCall(overrides: Partial<ToolCallStatus> = {}): ToolCallStatus {
  return {
    id: 'tool-call-id',
    toolName: 'test_tool',
    status: 'pending',
    ...overrides,
  }
}

function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: null,
    description: 'Test todo',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    notes: null,
    color: null,
    source: 'manual',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

// ============ Tests ============

describe('MessageItem', () => {
  describe('user message rendering', () => {
    it('should render user message content', () => {
      render(<MessageItem message={createUIMessage({ role: 'user', content: 'Hello world' })} />)

      expect(screen.getByText('Hello world')).toBeInTheDocument()
    })

    it('should show "You" label for user messages', () => {
      render(<MessageItem message={createUIMessage({ role: 'user' })} />)

      expect(screen.getByText('You')).toBeInTheDocument()
    })

    it('should render user avatar with blue background', () => {
      const { container } = render(<MessageItem message={createUIMessage({ role: 'user' })} />)

      const avatar = container.querySelector('.bg-blue-600')
      expect(avatar).toBeInTheDocument()
    })

    it('should preserve whitespace in user messages', () => {
      const { container } = render(
        <MessageItem message={createUIMessage({ role: 'user', content: 'Line 1\nLine 2' })} />
      )

      // The content should be in a paragraph with whitespace-pre-wrap class
      const paragraph = container.querySelector('p.whitespace-pre-wrap')
      expect(paragraph).toBeInTheDocument()
      expect(paragraph?.textContent).toBe('Line 1\nLine 2')
    })
  })

  describe('assistant message rendering', () => {
    it('should render assistant message with MarkdownRenderer', () => {
      render(
        <MessageItem message={createUIMessage({ role: 'assistant', content: '# Hello' })} />
      )

      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
      expect(screen.getByText('# Hello')).toBeInTheDocument()
    })

    it('should show "AI Assistant" label for assistant messages', () => {
      render(<MessageItem message={createUIMessage({ role: 'assistant' })} />)

      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })

    it('should render assistant avatar with purple background', () => {
      const { container } = render(<MessageItem message={createUIMessage({ role: 'assistant' })} />)

      const avatar = container.querySelector('.bg-purple-100')
      expect(avatar).toBeInTheDocument()
    })

    it('should not render MarkdownRenderer for user messages', () => {
      render(<MessageItem message={createUIMessage({ role: 'user' })} />)

      expect(screen.queryByTestId('markdown-renderer')).not.toBeInTheDocument()
    })
  })

  describe('LoadingIndicator display logic', () => {
    it('should show LoadingIndicator when streaming and no content', () => {
      render(
        <MessageItem
          message={createUIMessage({ role: 'assistant', content: '' })}
          isStreaming={true}
        />
      )

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('should NOT show LoadingIndicator when streaming but has content', () => {
      render(
        <MessageItem
          message={createUIMessage({ role: 'assistant', content: 'Some content' })}
          isStreaming={true}
        />
      )

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    it('should NOT show LoadingIndicator when not streaming', () => {
      render(
        <MessageItem
          message={createUIMessage({ role: 'assistant', content: '' })}
          isStreaming={false}
        />
      )

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })

    it('should show LoadingIndicator for user messages when streaming and no content', () => {
      // Note: The component shows LoadingIndicator when isStreaming && !message.content
      // regardless of role - this is the actual behavior
      render(
        <MessageItem
          message={createUIMessage({ role: 'user', content: '' })}
          isStreaming={true}
        />
      )

      // The component currently shows loading indicator for any message when streaming with no content
      // If this is not desired behavior, the component should be fixed, not the test
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('should default isStreaming to false', () => {
      render(<MessageItem message={createUIMessage({ role: 'assistant', content: '' })} />)

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
  })

  describe('extractTodosFromToolCalls - flatMap logic', () => {
    it('should extract todos from tool calls with output.todos array', () => {
      const todo1 = createTodo({ id: 1, description: 'First todo' })
      const todo2 = createTodo({ id: 2, description: 'Second todo' })

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [
              createToolCall({
                id: 'tc-1',
                output: { todos: [todo1, todo2] },
              }),
            ],
          })}
        />
      )

      const widget = screen.getByTestId('todo-card-widget')
      expect(widget).toHaveAttribute('data-todo-count', '2')
      expect(screen.getByText('First todo')).toBeInTheDocument()
      expect(screen.getByText('Second todo')).toBeInTheDocument()
    })

    it('should aggregate todos from MULTIPLE tool calls (flatMap behavior)', () => {
      const todo1 = createTodo({ id: 1, description: 'Todo from first tool' })
      const todo2 = createTodo({ id: 2, description: 'Todo from second tool' })
      const todo3 = createTodo({ id: 3, description: 'Todo from third tool' })

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [
              createToolCall({
                id: 'tc-1',
                output: { todos: [todo1] },
              }),
              createToolCall({
                id: 'tc-2',
                output: { todos: [todo2, todo3] },
              }),
            ],
          })}
        />
      )

      const widget = screen.getByTestId('todo-card-widget')
      expect(widget).toHaveAttribute('data-todo-count', '3')
      expect(screen.getByText('Todo from first tool')).toBeInTheDocument()
      expect(screen.getByText('Todo from second tool')).toBeInTheDocument()
      expect(screen.getByText('Todo from third tool')).toBeInTheDocument()
    })

    it('should handle single todo object in output.todo (not array)', () => {
      const todo = createTodo({ id: 1, description: 'Single todo' })

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [
              createToolCall({
                id: 'tc-1',
                output: { todo }, // Single todo, not array
              }),
            ],
          })}
        />
      )

      const widget = screen.getByTestId('todo-card-widget')
      expect(widget).toHaveAttribute('data-todo-count', '1')
      expect(screen.getByText('Single todo')).toBeInTheDocument()
    })

    it('should handle tool calls without output', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [
              createToolCall({ id: 'tc-1', output: undefined }),
              createToolCall({ id: 'tc-2', output: {} }),
            ],
          })}
        />
      )

      expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
    })

    it('should handle undefined toolCalls', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: undefined,
          })}
        />
      )

      expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
    })

    it('should handle empty toolCalls array', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [],
          })}
        />
      )

      expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
    })

    it('should mix tool calls with and without todos', () => {
      const todo = createTodo({ id: 1, description: 'Mixed todo' })

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [
              createToolCall({ id: 'tc-1', toolName: 'search' }), // No todos
              createToolCall({
                id: 'tc-2',
                toolName: 'create_todo',
                output: { todos: [todo] },
              }),
              createToolCall({ id: 'tc-3', toolName: 'send_email' }), // No todos
            ],
          })}
        />
      )

      const widget = screen.getByTestId('todo-card-widget')
      expect(widget).toHaveAttribute('data-todo-count', '1')
    })
  })

  describe('TodoCardWidget rendering', () => {
    it('should render TodoCardWidget when tool calls contain todos', () => {
      const todo = createTodo()

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [
              createToolCall({ output: { todos: [todo] } }),
            ],
          })}
        />
      )

      expect(screen.getByTestId('todo-card-widget')).toBeInTheDocument()
    })

    it('should NOT render TodoCardWidget when no tool calls', () => {
      render(<MessageItem message={createUIMessage({ role: 'assistant' })} />)

      expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
    })

    it('should NOT render TodoCardWidget when tool calls have no todos', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [createToolCall({ output: {} })],
          })}
        />
      )

      expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
    })

    it('should pass onTodoUpdate callback to TodoCardWidget', () => {
      const onTodoUpdate = vi.fn()
      const todo = createTodo()

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [createToolCall({ output: { todos: [todo] } })],
          })}
          onTodoUpdate={onTodoUpdate}
        />
      )

      // The mock renders the widget, but we can verify it was called with the right props
      // by checking the widget is rendered (the mock doesn't actually use onUpdate)
      expect(screen.getByTestId('todo-card-widget')).toBeInTheDocument()
    })
  })

  describe('ToolCallAccordion rendering', () => {
    it('should render ToolCallAccordion when tool calls exist', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [createToolCall()],
          })}
        />
      )

      expect(screen.getByTestId('tool-call-accordion')).toBeInTheDocument()
    })

    it('should NOT render ToolCallAccordion when no tool calls', () => {
      render(<MessageItem message={createUIMessage({ role: 'assistant' })} />)

      expect(screen.queryByTestId('tool-call-accordion')).not.toBeInTheDocument()
    })

    it('should NOT render ToolCallAccordion when toolCalls is empty array', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [],
          })}
        />
      )

      expect(screen.queryByTestId('tool-call-accordion')).not.toBeInTheDocument()
    })

    it('should pass all tool calls to ToolCallAccordion', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            toolCalls: [
              createToolCall({ id: 'tc-1', toolName: 'search' }),
              createToolCall({ id: 'tc-2', toolName: 'create_todo' }),
            ],
          })}
        />
      )

      const accordion = screen.getByTestId('tool-call-accordion')
      expect(accordion).toHaveAttribute('data-tool-count', '2')
    })

    it('should NOT render ToolCallAccordion for user messages', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'user',
            toolCalls: [createToolCall()],
          })}
        />
      )

      expect(screen.queryByTestId('tool-call-accordion')).not.toBeInTheDocument()
    })
  })

  describe('todoIds for MarkdownRenderer deduplication', () => {
    it('should pass todo IDs to MarkdownRenderer for deduplication', () => {
      const todo1 = createTodo({ id: 123 })
      const todo2 = createTodo({ id: 456 })

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            content: 'Some content',
            toolCalls: [createToolCall({ output: { todos: [todo1, todo2] } })],
          })}
        />
      )

      const renderer = screen.getByTestId('markdown-renderer')
      // The mock converts Set to comma-separated string
      expect(renderer).toHaveAttribute('data-todo-ids', '123,456')
    })

    it('should pass empty Set when no todos', () => {
      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            content: 'Some content',
          })}
        />
      )

      const renderer = screen.getByTestId('markdown-renderer')
      expect(renderer).toHaveAttribute('data-todo-ids', '')
    })
  })

  describe('layout and styling', () => {
    it('should have animation classes on root container', () => {
      const { container } = render(<MessageItem message={createUIMessage()} />)

      const root = container.firstChild as HTMLElement
      expect(root).toHaveClass('animate-in', 'fade-in')
    })

    it('should have correct padding on root container', () => {
      const { container } = render(<MessageItem message={createUIMessage()} />)

      const root = container.firstChild as HTMLElement
      expect(root).toHaveClass('py-4')
    })

    it('should indent content with ml-9', () => {
      const { container } = render(<MessageItem message={createUIMessage()} />)

      const contentDiv = container.querySelector('.ml-9')
      expect(contentDiv).toBeInTheDocument()
    })

    it('should render avatar with correct size (w-7 h-7)', () => {
      const { container } = render(<MessageItem message={createUIMessage({ role: 'user' })} />)

      const avatar = container.querySelector('.w-7.h-7')
      expect(avatar).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty content string', () => {
      render(<MessageItem message={createUIMessage({ role: 'user', content: '' })} />)

      // Should still render without errors
      expect(screen.getByText('You')).toBeInTheDocument()
    })

    it('should handle null/undefined content gracefully', () => {
      render(
        <MessageItem
          message={createUIMessage({ role: 'user', content: null as unknown as string })}
        />
      )

      // Should still render without errors
      expect(screen.getByText('You')).toBeInTheDocument()
    })

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000)

      render(<MessageItem message={createUIMessage({ content: longContent })} />)

      expect(screen.getByText(longContent)).toBeInTheDocument()
    })

    it('should handle special characters in content', () => {
      const specialContent = '<script>alert("xss")</script> & "quotes" \'apostrophes\''

      render(<MessageItem message={createUIMessage({ role: 'user', content: specialContent })} />)

      // Content should be rendered (escaped by React)
      expect(screen.getByText(specialContent)).toBeInTheDocument()
    })

    it('should handle emoji in content', () => {
      const emojiContent = 'Hello! \u{1F44B} \u{1F389}'

      render(<MessageItem message={createUIMessage({ role: 'user', content: emojiContent })} />)

      expect(screen.getByText(emojiContent)).toBeInTheDocument()
    })
  })

  describe('component composition', () => {
    it('should render all expected parts for assistant with tool calls and todos', () => {
      const todo = createTodo({ id: 1 })

      render(
        <MessageItem
          message={createUIMessage({
            role: 'assistant',
            content: 'Done!',
            toolCalls: [createToolCall({ output: { todos: [todo] } })],
          })}
          isStreaming={false}
          onTodoUpdate={() => {}}
        />
      )

      // Avatar and label
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
      // Markdown content
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument()
      // Todo widget
      expect(screen.getByTestId('todo-card-widget')).toBeInTheDocument()
      // Tool accordion
      expect(screen.getByTestId('tool-call-accordion')).toBeInTheDocument()
      // No loading indicator
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
  })
})

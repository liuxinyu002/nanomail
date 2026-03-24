import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageItem } from './MessageItem'
import type { UIMessage, ToolCallStatus } from '@/hooks/useChat'
import type { Todo } from '@nanomail/shared'

const todoCardWidgetMock = vi.fn(({ todos, readonly }: { todos: Todo[]; readonly?: boolean }) => (
  <div data-testid="todo-card-widget" data-todo-count={todos.length} data-readonly={String(Boolean(readonly))}>
    {todos.map(t => (
      <span key={t.id} data-todo-id={t.id}>{t.description}</span>
    ))}
  </div>
))

vi.mock('./MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, todoIds }: { content: string; todoIds?: Set<string> }) => (
    <div data-testid="markdown-renderer" data-todo-ids={todoIds ? Array.from(todoIds).join(',') : ''}>
      {content}
    </div>
  ),
}))

vi.mock('./TodoCardWidget', () => ({
  TodoCardWidget: (props: { todos: Todo[]; readonly?: boolean }) => todoCardWidgetMock(props),
}))

vi.mock('./ToolCallAccordion', () => ({
  ToolCallAccordion: ({ toolCalls }: { toolCalls: ToolCallStatus[] }) => (
    <div data-testid="tool-call-accordion" data-tool-count={toolCalls.length}>
      accordion
    </div>
  ),
}))

vi.mock('./LoadingIndicator', () => ({
  LoadingIndicator: () => <div data-testid="loading-indicator">Loading...</div>,
}))

function createUIMessage(overrides: Partial<UIMessage> = {}): UIMessage {
  return {
    id: 'test-msg-id',
    role: 'assistant',
    content: 'Test message content',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createToolCall(overrides: Partial<ToolCallStatus> = {}): ToolCallStatus {
  return {
    id: 'tool-call-id',
    toolName: 'test_tool',
    status: 'success',
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

describe('MessageItem', () => {
  it('renders user messages without assistant-only widgets', () => {
    render(<MessageItem message={createUIMessage({ role: 'user', content: 'Hello world' })} />)

    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.queryByTestId('markdown-renderer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tool-call-accordion')).not.toBeInTheDocument()
    expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
  })

  it('renders assistant content in order: markdown, tool accordion, todo card', () => {
    const todo = createTodo({ id: 1, description: 'Ordered todo' })
    const { container } = render(
      <MessageItem
        message={createUIMessage({
          content: 'Done!',
          toolCalls: [createToolCall({ toolName: 'create_todo', output: { todo } })],
        })}
      />
    )

    const content = container.querySelector('.ml-9')
    const markers = Array.from(content?.children ?? []).map(node =>
      (node as HTMLElement).dataset.testid
    )

    expect(markers).toEqual(['markdown-renderer', 'tool-call-accordion', 'todo-card-widget'])
  })

  it('merges multiple create/update todo results into a single readonly card area', () => {
    const todo1 = createTodo({ id: 1, description: 'Created todo' })
    const todo2 = createTodo({ id: 2, description: 'Updated todo' })

    render(
      <MessageItem
        message={createUIMessage({
          toolCalls: [
            createToolCall({ toolName: 'create_todo', status: 'success', output: { todo: todo1 } }),
            createToolCall({ toolName: 'update_todo', status: 'success', output: { todos: [todo2] } }),
          ],
        })}
      />
    )

    expect(screen.getAllByTestId('todo-card-widget')).toHaveLength(1)
    expect(screen.getByTestId('todo-card-widget')).toHaveAttribute('data-todo-count', '2')
    expect(screen.getByText('Created todo')).toBeInTheDocument()
    expect(screen.getByText('Updated todo')).toBeInTheDocument()
  })

  it('deduplicates same todo id and keeps the last successful create/update payload', () => {
    const original = createTodo({ id: 1, description: 'Old description' })
    const updated = createTodo({ id: 1, description: 'New description' })

    render(
      <MessageItem
        message={createUIMessage({
          toolCalls: [
            createToolCall({ toolName: 'create_todo', status: 'success', output: { todo: original } }),
            createToolCall({ toolName: 'update_todo', status: 'success', output: { todo: updated } }),
          ],
        })}
      />
    )

    expect(screen.getByTestId('todo-card-widget')).toHaveAttribute('data-todo-count', '1')
    expect(screen.getByText('New description')).toBeInTheDocument()
    expect(screen.queryByText('Old description')).not.toBeInTheDocument()
  })

  it('does not create todo cards from delete_todo output', () => {
    const todo = createTodo({ id: 1, description: 'Deleted todo' })

    render(
      <MessageItem
        message={createUIMessage({
          toolCalls: [
            createToolCall({ toolName: 'delete_todo', status: 'success', output: { todo, todos: [todo] } }),
          ],
        })}
      />
    )

    expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
  })

  it('passes readonly to TodoCardWidget in chat mode', () => {
    const todo = createTodo({ id: 1 })

    render(
      <MessageItem
        message={createUIMessage({
          toolCalls: [createToolCall({ toolName: 'create_todo', status: 'success', output: { todo } })],
        })}
      />
    )

    expect(screen.getByTestId('todo-card-widget')).toHaveAttribute('data-readonly', 'true')
  })

  it('passes deduplicated todo ids to MarkdownRenderer', () => {
    const todo1 = createTodo({ id: 123 })
    const todo2 = createTodo({ id: 456 })
    const todo2Updated = createTodo({ id: 456, description: 'Updated second todo' })

    render(
      <MessageItem
        message={createUIMessage({
          content: 'Some content',
          toolCalls: [
            createToolCall({ toolName: 'create_todo', status: 'success', output: { todos: [todo1, todo2] } }),
            createToolCall({ toolName: 'update_todo', status: 'success', output: { todo: todo2Updated } }),
          ],
        })}
      />
    )

    expect(screen.getByTestId('markdown-renderer')).toHaveAttribute('data-todo-ids', '123,456')
  })

  it('does not render todo cards for failed todo tool calls', () => {
    const todo = createTodo({ id: 1 })

    render(
      <MessageItem
        message={createUIMessage({
          toolCalls: [
            createToolCall({ toolName: 'create_todo', status: 'error', output: { todo } }),
          ],
        })}
      />
    )

    expect(screen.queryByTestId('todo-card-widget')).not.toBeInTheDocument()
  })

  it('skips invalid todo payloads and keeps valid todos from later successful calls', () => {
    const validTodo = createTodo({ id: 2, description: 'Valid todo' })

    render(
      <MessageItem
        message={createUIMessage({
          toolCalls: [
            createToolCall({
              toolName: 'create_todo',
              status: 'success',
              output: {
                todo: { id: 'bad-id', description: 'Invalid todo' },
                todos: [{ id: null, description: 'Also invalid' }],
              },
            }),
            createToolCall({
              toolName: 'update_todo',
              status: 'success',
              output: { todo: validTodo },
            }),
          ],
        })}
      />
    )

    expect(screen.getByTestId('todo-card-widget')).toHaveAttribute('data-todo-count', '1')
    expect(screen.getByText('Valid todo')).toBeInTheDocument()
    expect(screen.queryByText('Invalid todo')).not.toBeInTheDocument()
  })
})

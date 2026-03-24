import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoCardWidget } from './TodoCardWidget'
import { todoService } from '@/services/todo.service'
import type { Todo } from '@nanomail/shared'

vi.mock('@/services/todo.service', () => ({
  todoService: {
    update: vi.fn(),
  },
}))

function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: null,
    description: 'Test todo description',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    notes: null,
    color: null,
    source: 'manual',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

describe('TodoCardWidget', () => {
  const mockTodoService = vi.mocked(todoService)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the neutral card shell', () => {
    const { container } = render(<TodoCardWidget todos={[createTodo()]} readonly />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('border', 'border-gray-200', 'rounded-lg', 'bg-white')
    expect(screen.getByText('Todos')).toBeInTheDocument()
  })

  it('hides checkbox, edit, and delete controls in readonly mode', () => {
    render(
      <TodoCardWidget
        todos={[createTodo()]}
        readonly
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Edit todo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete todo')).not.toBeInTheDocument()
  })

  it('does not trigger updates in readonly mode', async () => {
    render(<TodoCardWidget todos={[createTodo({ id: 1, status: 'pending' })]} readonly />)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(mockTodoService.update).not.toHaveBeenCalled()
  })

  it('keeps non-readonly interactions working', async () => {
    const onUpdate = vi.fn()
    mockTodoService.update.mockResolvedValueOnce(createTodo({ status: 'completed' }))

    render(
      <TodoCardWidget
        todos={[createTodo({ id: 1, status: 'pending' })]}
        onUpdate={onUpdate}
      />
    )

    fireEvent.click(screen.getByRole('checkbox'))

    await waitFor(() => {
      expect(mockTodoService.update).toHaveBeenCalledWith('1', { status: 'completed' })
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })
  })

  it('shows completed todos with gray strikethrough styling in readonly mode', () => {
    const { container } = render(
      <TodoCardWidget todos={[createTodo({ status: 'completed' })]} readonly />
    )

    const description = container.querySelector('.line-through.text-gray-400')
    expect(description).toBeInTheDocument()
    expect(description).toHaveTextContent('Test todo description')
  })

  it('renders deadline text when provided', () => {
    render(
      <TodoCardWidget
        todos={[createTodo({ deadline: '2024-03-15T14:30:00.000Z' })]}
        readonly
      />
    )

    expect(screen.getByText(/\d{2}\/\d{2}\s+\d{2}:\d{2}/)).toBeInTheDocument()
  })
})

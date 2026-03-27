import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodoCardWidget } from './TodoCardWidget'
import type { Todo } from '@nanomail/shared'

// Mock the mutation hooks
const mockMutateAsync = vi.fn()
vi.mock('@/hooks/useTodoMutations', () => ({
  useUpdateTodoMutation: () => ({
    mutateAsync: mockMutateAsync,
  }),
  useDeleteTodoMutation: () => ({
    mutateAsync: vi.fn(),
  }),
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('TodoCardWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the neutral card shell', () => {
    const { container } = render(<TodoCardWidget todos={[createTodo()]} readonly />, {
      wrapper: createWrapper(),
    })

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
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Edit todo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete todo')).not.toBeInTheDocument()
  })

  it('does not trigger updates in readonly mode', async () => {
    render(<TodoCardWidget todos={[createTodo({ id: 1, status: 'pending' })]} readonly />, {
      wrapper: createWrapper(),
    })

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('keeps non-readonly interactions working', async () => {
    mockMutateAsync.mockResolvedValueOnce(createTodo({ status: 'completed' }))

    render(
      <TodoCardWidget
        todos={[createTodo({ id: 1, status: 'pending' })]}
      />,
      { wrapper: createWrapper() }
    )

    fireEvent.click(screen.getByRole('checkbox'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: { status: 'completed' },
      })
    })
  })

  it('shows completed todos with gray strikethrough styling in readonly mode', () => {
    const { container } = render(
      <TodoCardWidget todos={[createTodo({ status: 'completed' })]} readonly />,
      { wrapper: createWrapper() }
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
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/\d{2}\/\d{2}\s+\d{2}:\d{2}/)).toBeInTheDocument()
  })
})
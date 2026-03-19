import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TodoEditForm } from './TodoEditForm'
import type { TodoItem } from '@/services'

// Mock the mutations hook
const mockMutate = vi.fn()
vi.mock('@/hooks/useTodoMutations', () => ({
  useUpdateTodoMutation: () => ({ mutate: mockMutate }),
}))

describe('TodoEditForm', () => {
  const mockTodo: TodoItem = {
    id: 1,
    emailId: 100,
    description: 'Test todo description',
    status: 'pending',
    deadline: '2024-01-20T00:00:00.000Z',
    boardColumnId: 2,
    createdAt: '2024-01-10T00:00:00.000Z',
  }

  const mockOnCancel = vi.fn()

  beforeEach(() => {
    mockMutate.mockClear()
    mockOnCancel.mockClear()
  })

  const renderWithQueryClient = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    )
  }

  describe('rendering', () => {
    it('renders with todo data pre-populated', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      expect(screen.getByDisplayValue('Test todo description')).toBeInTheDocument()
    })

    it('renders description textarea', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    })

    it('renders deadline picker button', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      expect(screen.getByLabelText(/deadline/i)).toBeInTheDocument()
    })
  })

  describe('form interactions', () => {
    it('allows changing description', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      const textarea = screen.getByDisplayValue('Test todo description')
      fireEvent.change(textarea, { target: { value: 'Updated description' } })

      expect(screen.getByDisplayValue('Updated description')).toBeInTheDocument()
    })

    it('shows Cancel and Save buttons', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })
  })

  describe('save functionality', () => {
    it('calls mutate with correct data when Save is clicked', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      const saveButton = screen.getByRole('button', { name: /save/i })
      fireEvent.click(saveButton)

      // deadline is converted from date value to ISO string with end of day
      expect(mockMutate).toHaveBeenCalledWith({
        id: 1,
        data: {
          description: 'Test todo description',
          deadline: '2024-01-20T23:59:59.999Z',
        },
      })
    })

    it('calls onCancel after save', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      const saveButton = screen.getByRole('button', { name: /save/i })
      fireEvent.click(saveButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('cancel functionality', () => {
    it('calls onCancel when Cancel is clicked', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })

  describe('deadline handling', () => {
    it('handles todo without deadline', () => {
      const todoWithoutDeadline: TodoItem = {
        ...mockTodo,
        deadline: null,
      }

      renderWithQueryClient(
        <TodoEditForm todo={todoWithoutDeadline} onCancel={mockOnCancel} />
      )

      // datetime-local input should be empty when no deadline
      const deadlineInput = screen.getByLabelText(/deadline/i)
      expect(deadlineInput).toHaveValue('')
    })

    it('handles todo with deadline', () => {
      renderWithQueryClient(
        <TodoEditForm todo={mockTodo} onCancel={mockOnCancel} />
      )

      // date input should have the deadline value
      const deadlineInput = screen.getByLabelText(/deadline/i)
      // UTC 2024-01-20T00:00:00.000Z = local 2024-01-20 08:00 (UTC+8)
      expect(deadlineInput).toHaveValue('2024-01-20')
    })
  })
})
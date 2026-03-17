import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TodoItem, type TodoItemProps } from './TodoItem'
import type { TodoItem as TodoItemType } from '@/services'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
      <a href={to} className={className} data-testid="email-link">
        {children}
      </a>
    ),
  }
})

// Mock mutation hooks
const mockUpdateMutate = vi.fn()
const mockDeleteMutate = vi.fn()

vi.mock('@/hooks', () => ({
  useUpdateTodoMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteTodoMutation: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}))

describe('TodoItem', () => {
  const mockTodo: TodoItemType = {
    id: 1,
    emailId: 100,
    description: 'Review the quarterly report',
    status: 'pending',
    deadline: null,
    boardColumnId: 2, // Todo column
    createdAt: '2024-01-15T10:00:00.000Z',
  }

  const defaultProps: TodoItemProps = {
    todo: mockTodo,
  }

  beforeEach(() => {
    mockUpdateMutate.mockReset()
    mockDeleteMutate.mockReset()
    mockNavigate.mockReset()
  })

  describe('Rendering', () => {
    it('should render todo description', () => {
      render(<TodoItem {...defaultProps} />)

      expect(screen.getByText('Review the quarterly report')).toBeInTheDocument()
    })

    it('should render unchecked checkbox for pending todo', () => {
      render(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render checked checkbox for completed todo', () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }
      render(<TodoItem {...defaultProps} todo={completedTodo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should show line-through style for completed todo', () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }
      render(<TodoItem {...defaultProps} todo={completedTodo} />)

      const description = screen.getByText('Review the quarterly report')
      expect(description).toHaveClass('line-through')
    })

    it('should have left border color based on boardColumnId - red for Todo column (2)', () => {
      render(<TodoItem {...defaultProps} />)

      const container = screen.getByTestId('todo-item-container')
      expect(container).toHaveClass('border-l-red-500')
    })

    it('should have left border color based on boardColumnId - amber for In Progress column (3)', () => {
      const inProgressTodo = { ...mockTodo, boardColumnId: 3 }
      render(<TodoItem {...defaultProps} todo={inProgressTodo} />)

      const container = screen.getByTestId('todo-item-container')
      expect(container).toHaveClass('border-l-amber-500')
    })

    it('should have left border color based on boardColumnId - blue for Inbox column (1)', () => {
      const inboxTodo = { ...mockTodo, boardColumnId: 1 }
      render(<TodoItem {...defaultProps} todo={inboxTodo} />)

      const container = screen.getByTestId('todo-item-container')
      expect(container).toHaveClass('border-l-blue-500')
    })

    it('should have left border color based on boardColumnId - green for Done column (4)', () => {
      const doneTodo = { ...mockTodo, boardColumnId: 4 }
      render(<TodoItem {...defaultProps} todo={doneTodo} />)

      const container = screen.getByTestId('todo-item-container')
      expect(container).toHaveClass('border-l-green-500')
    })
  })

  describe('Email Link', () => {
    it('should link to the source email', () => {
      render(<TodoItem {...defaultProps} />)

      const link = screen.getByTestId('email-link')
      expect(link).toHaveAttribute('href', '/inbox/100')
    })
  })

  describe('Toggle Completion', () => {
    it('should call updateMutation.mutate when checkbox is clicked', async () => {
      render(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 1,
        data: { status: 'completed' },
      })
    })

    it('should toggle from completed to pending', async () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }

      render(<TodoItem {...defaultProps} todo={completedTodo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 1,
        data: { status: 'pending' },
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible checkbox label', () => {
      render(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox', { name: /review the quarterly report/i })
      expect(checkbox).toBeInTheDocument()
    })
  })

  describe('Assist Reply Button', () => {
    it('should render Assist Reply button for pending todos', () => {
      render(
        <MemoryRouter>
          <TodoItem {...defaultProps} />
        </MemoryRouter>
      )

      expect(screen.getByRole('button', { name: /assist reply/i })).toBeInTheDocument()
    })

    it('should not render Assist Reply button for completed todos', () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }
      render(
        <MemoryRouter>
          <TodoItem {...defaultProps} todo={completedTodo} />
        </MemoryRouter>
      )

      expect(screen.queryByRole('button', { name: /assist reply/i })).not.toBeInTheDocument()
    })

    it('should navigate to inbox with router state on Assist Reply click', async () => {
      render(
        <MemoryRouter>
          <TodoItem {...defaultProps} />
        </MemoryRouter>
      )

      const assistButton = screen.getByRole('button', { name: /assist reply/i })
      fireEvent.click(assistButton)

      expect(mockNavigate).toHaveBeenCalledWith('/inbox/100', {
        state: {
          action: 'assist_reply',
          instruction: 'Review the quarterly report',
        },
      })
    })

    it('should navigate with correct instruction from todo description', async () => {
      const customTodo = { ...mockTodo, description: 'Reply about the meeting tomorrow' }
      render(
        <MemoryRouter>
          <TodoItem {...defaultProps} todo={customTodo} />
        </MemoryRouter>
      )

      const assistButton = screen.getByRole('button', { name: /assist reply/i })
      fireEvent.click(assistButton)

      expect(mockNavigate).toHaveBeenCalledWith('/inbox/100', {
        state: {
          action: 'assist_reply',
          instruction: 'Reply about the meeting tomorrow',
        },
      })
    })

    it('should navigate with correct emailId from todo', async () => {
      const customTodo = { ...mockTodo, emailId: 456 }
      render(
        <MemoryRouter>
          <TodoItem {...defaultProps} todo={customTodo} />
        </MemoryRouter>
      )

      const assistButton = screen.getByRole('button', { name: /assist reply/i })
      fireEvent.click(assistButton)

      expect(mockNavigate).toHaveBeenCalledWith('/inbox/456', {
        state: {
          action: 'assist_reply',
          instruction: 'Review the quarterly report',
        },
      })
    })
  })

  describe('Delete Button', () => {
    it('should not render delete button by default', () => {
      render(<TodoItem {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('should render delete button when showDelete is true', () => {
      render(<TodoItem {...defaultProps} showDelete={true} />)

      expect(screen.getByRole('button', { name: /delete todo/i })).toBeInTheDocument()
    })

    it('should show confirmation text on first click', async () => {
      render(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteButton = screen.getByRole('button', { name: /delete todo/i })
      fireEvent.click(deleteButton)

      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
      expect(screen.getByText('确认?')).toBeInTheDocument()
    })

    it('should call delete mutation on second click', async () => {
      render(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteButton = screen.getByRole('button', { name: /delete todo/i })

      // First click - show confirmation
      fireEvent.click(deleteButton)

      // Second click - confirm delete
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i })
      fireEvent.click(confirmButton)

      expect(mockDeleteMutate).toHaveBeenCalledWith(1)
    })

    it('should reset confirmation state on mouse leave', async () => {
      render(<TodoItem {...defaultProps} showDelete={true} />)

      const deleteButton = screen.getByRole('button', { name: /delete todo/i })
      fireEvent.click(deleteButton)

      // Should show confirmation
      expect(screen.getByText('确认?')).toBeInTheDocument()

      // Mouse leave should reset
      const container = screen.getByTestId('todo-item-container')
      fireEvent.mouseLeave(container)

      // Should be back to delete button
      expect(screen.getByRole('button', { name: /delete todo/i })).toBeInTheDocument()
    })
  })
})
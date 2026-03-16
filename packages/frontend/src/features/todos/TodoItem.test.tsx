import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoItem, type TodoItemProps } from './TodoItem'
import type { TodoItem as TodoItemType } from '@/services'

// Mock react-router-dom Link
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className} data-testid="email-link">
      {children}
    </a>
  ),
}))

// Mock AssistReplySheet
vi.mock('./AssistReplySheet', () => ({
  AssistReplySheet: ({ open, onOpenChange, todo }: { open: boolean; onOpenChange: (open: boolean) => void; todo: TodoItemType }) => (
    <div data-testid="assist-reply-sheet" data-open={open}>
      {open && <span>Assist Reply Sheet for {todo.description}</span>}
      <button onClick={() => onOpenChange(false)}>Close Sheet</button>
    </div>
  ),
}))

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
    urgency: 'high',
    status: 'pending',
    deadline: null,
    createdAt: '2024-01-15T10:00:00.000Z',
  }

  const defaultProps: TodoItemProps = {
    todo: mockTodo,
  }

  beforeEach(() => {
    mockUpdateMutate.mockReset()
    mockDeleteMutate.mockReset()
  })

  describe('Rendering', () => {
    it('should render todo description', () => {
      render(<TodoItem {...defaultProps} />)

      expect(screen.getByText('Review the quarterly report')).toBeInTheDocument()
    })

    it('should render urgency badge for high priority', () => {
      render(<TodoItem {...defaultProps} />)

      expect(screen.getByText('high')).toBeInTheDocument()
    })

    it('should render urgency badge for medium priority', () => {
      const mediumTodo = { ...mockTodo, urgency: 'medium' as const }
      render(<TodoItem {...defaultProps} todo={mediumTodo} />)

      expect(screen.getByText('medium')).toBeInTheDocument()
    })

    it('should render urgency badge for low priority', () => {
      const lowTodo = { ...mockTodo, urgency: 'low' as const }
      render(<TodoItem {...defaultProps} todo={lowTodo} />)

      expect(screen.getByText('low')).toBeInTheDocument()
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

    it('should have left border color based on urgency - red for high', () => {
      render(<TodoItem {...defaultProps} />)

      const container = screen.getByTestId('todo-item-container')
      expect(container).toHaveClass('border-l-red-500')
    })

    it('should have left border color based on urgency - amber for medium', () => {
      const mediumTodo = { ...mockTodo, urgency: 'medium' as const }
      render(<TodoItem {...defaultProps} todo={mediumTodo} />)

      const container = screen.getByTestId('todo-item-container')
      expect(container).toHaveClass('border-l-amber-500')
    })

    it('should have left border color based on urgency - blue for low', () => {
      const lowTodo = { ...mockTodo, urgency: 'low' as const }
      render(<TodoItem {...defaultProps} todo={lowTodo} />)

      const container = screen.getByTestId('todo-item-container')
      expect(container).toHaveClass('border-l-blue-500')
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
      render(<TodoItem {...defaultProps} />)

      expect(screen.getByRole('button', { name: /assist reply/i })).toBeInTheDocument()
    })

    it('should not render Assist Reply button for completed todos', () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }
      render(<TodoItem {...defaultProps} todo={completedTodo} />)

      expect(screen.queryByRole('button', { name: /assist reply/i })).not.toBeInTheDocument()
    })

    it('should open AssistReplySheet when button is clicked', async () => {
      render(<TodoItem {...defaultProps} />)

      const assistButton = screen.getByRole('button', { name: /assist reply/i })
      fireEvent.click(assistButton)

      await waitFor(() => {
        expect(screen.getByTestId('assist-reply-sheet')).toHaveAttribute('data-open', 'true')
      })
    })

    it('should close AssistReplySheet when onOpenChange is called with false', async () => {
      render(<TodoItem {...defaultProps} />)

      // Open the sheet
      const assistButton = screen.getByRole('button', { name: /assist reply/i })
      fireEvent.click(assistButton)

      await waitFor(() => {
        expect(screen.getByTestId('assist-reply-sheet')).toHaveAttribute('data-open', 'true')
      })

      // Close the sheet
      const closeButton = screen.getByRole('button', { name: /close sheet/i })
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.getByTestId('assist-reply-sheet')).toHaveAttribute('data-open', 'false')
      })
    })

    it('should pass todo to AssistReplySheet', async () => {
      render(<TodoItem {...defaultProps} />)

      const assistButton = screen.getByRole('button', { name: /assist reply/i })
      fireEvent.click(assistButton)

      await waitFor(() => {
        expect(screen.getByText(/Assist Reply Sheet for Review the quarterly report/i)).toBeInTheDocument()
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
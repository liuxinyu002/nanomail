import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoItem, type TodoItemProps } from './TodoItem'
import type { TodoItem as TodoItemType } from '@/services'

// Mock the services
const mockUpdateTodoStatus = vi.fn()

vi.mock('@/services', () => ({
  TodoService: {
    updateTodoStatus: (id: number, status: string) => mockUpdateTodoStatus(id, status),
  },
}))

// Mock react-router-dom Link
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className} data-testid="email-link">
      {children}
    </a>
  ),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('TodoItem', () => {
  const mockTodo: TodoItemType = {
    id: 1,
    emailId: 100,
    description: 'Review the quarterly report',
    urgency: 'high',
    status: 'pending',
    createdAt: '2024-01-15T10:00:00.000Z',
  }

  const defaultProps: TodoItemProps = {
    todo: mockTodo,
    onStatusChange: vi.fn(),
  }

  beforeEach(() => {
    mockUpdateTodoStatus.mockReset()
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
      expect(link).toHaveAttribute('href', '/inbox?email=100')
    })
  })

  describe('Toggle Completion - Optimistic UI', () => {
    it('should call onStatusChange when checkbox is clicked', async () => {
      const onStatusChange = vi.fn()
      mockUpdateTodoStatus.mockResolvedValueOnce({
        ...mockTodo,
        status: 'completed',
      })

      render(<TodoItem {...defaultProps} onStatusChange={onStatusChange} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockUpdateTodoStatus).toHaveBeenCalledWith(1, 'completed')
      })
    })

    it('should optimistically show as completed immediately on click', async () => {
      mockUpdateTodoStatus.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      // Should immediately show as checked (optimistic update)
      expect(checkbox).toBeChecked()

      // Description should have line-through
      const description = screen.getByText('Review the quarterly report')
      expect(description).toHaveClass('line-through')
    })

    it('should rollback to pending state if API fails', async () => {
      const { toast } = await import('sonner')
      mockUpdateTodoStatus.mockRejectedValueOnce(new Error('API Error'))

      render(<TodoItem {...defaultProps} />)

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      // Optimistically checked
      expect(checkbox).toBeChecked()

      await waitFor(() => {
        // After failure, should rollback
        expect(checkbox).not.toBeChecked()
      })

      // Should show error toast
      expect(toast.error).toHaveBeenCalledWith('Failed to update todo status')
    })

    it('should toggle from completed to pending', async () => {
      const completedTodo = { ...mockTodo, status: 'completed' as const }
      mockUpdateTodoStatus.mockResolvedValueOnce({
        ...mockTodo,
        status: 'pending',
      })

      render(<TodoItem {...defaultProps} todo={completedTodo} />)

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()

      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockUpdateTodoStatus).toHaveBeenCalledWith(1, 'pending')
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
})
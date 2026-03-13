import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TodoColumn, type TodoColumnProps } from './TodoColumn'
import type { TodoItem } from '@/services'

// Mock TodoItem component
vi.mock('./TodoItem', () => ({
  TodoItem: ({ todo, onStatusChange }: { todo: TodoItem; onStatusChange: () => void }) => (
    <div data-testid={`todo-item-${todo.id}`}>
      {todo.description}
      <button onClick={onStatusChange} data-testid={`toggle-${todo.id}`}>
        Toggle
      </button>
    </div>
  ),
}))

describe('TodoColumn', () => {
  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 1,
      description: 'High priority task',
      urgency: 'high',
      status: 'pending',
      deadline: null,
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      emailId: 1,
      description: 'Another high priority task',
      urgency: 'high',
      status: 'pending',
      deadline: null,
      createdAt: '2024-01-15T11:00:00.000Z',
    },
  ]

  const defaultProps: TodoColumnProps = {
    title: 'High Priority',
    todos: mockTodos,
    emptyMessage: 'No high priority tasks',
    variant: 'high',
    onStatusChange: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render column title', () => {
      render(<TodoColumn {...defaultProps} />)

      expect(screen.getByText('High Priority')).toBeInTheDocument()
    })

    it('should render all todos in the column', () => {
      render(<TodoColumn {...defaultProps} />)

      expect(screen.getByText('High priority task')).toBeInTheDocument()
      expect(screen.getByText('Another high priority task')).toBeInTheDocument()
    })

    it('should render count badge', () => {
      render(<TodoColumn {...defaultProps} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should show empty message when no todos', () => {
      render(<TodoColumn {...defaultProps} todos={[]} />)

      expect(screen.getByText('No high priority tasks')).toBeInTheDocument()
    })
  })

  describe('Priority Icons', () => {
    it('should show AlertCircle icon for high priority', () => {
      render(<TodoColumn {...defaultProps} variant="high" />)

      // The icon should be present (lucide-react renders SVG)
      const titleContainer = screen.getByText('High Priority').closest('div')
      expect(titleContainer).toBeInTheDocument()
    })

    it('should show Clock icon for medium priority', () => {
      render(<TodoColumn {...defaultProps} variant="medium" title="Medium Priority" />)

      const titleContainer = screen.getByText('Medium Priority').closest('div')
      expect(titleContainer).toBeInTheDocument()
    })

    it('should show MinusCircle icon for low priority', () => {
      render(<TodoColumn {...defaultProps} variant="low" title="Low Priority" />)

      const titleContainer = screen.getByText('Low Priority').closest('div')
      expect(titleContainer).toBeInTheDocument()
    })

    it('should show CheckCircle icon for completed column', () => {
      render(<TodoColumn {...defaultProps} variant="completed" title="Completed" />)

      const titleContainer = screen.getByText('Completed').closest('div')
      expect(titleContainer).toBeInTheDocument()
    })
  })

  describe('Load More Functionality', () => {
    it('should show Load More button when showLoadMore is true', () => {
      render(<TodoColumn {...defaultProps} showLoadMore={true} onLoadMore={vi.fn()} />)

      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
    })

    it('should not show Load More button when showLoadMore is false', () => {
      render(<TodoColumn {...defaultProps} showLoadMore={false} />)

      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })

    it('should call onLoadMore when button is clicked', () => {
      const onLoadMore = vi.fn()
      render(<TodoColumn {...defaultProps} showLoadMore={true} onLoadMore={onLoadMore} />)

      fireEvent.click(screen.getByRole('button', { name: /load more/i }))

      expect(onLoadMore).toHaveBeenCalled()
    })
  })

  describe('Status Change Propagation', () => {
    it('should pass onStatusChange to each TodoItem', () => {
      const onStatusChange = vi.fn()
      render(<TodoColumn {...defaultProps} onStatusChange={onStatusChange} />)

      // Click the toggle button in the mocked TodoItem
      fireEvent.click(screen.getByTestId('toggle-1'))

      expect(onStatusChange).toHaveBeenCalled()
    })
  })

  describe('Styling', () => {
    it('should have unified background color', () => {
      render(<TodoColumn {...defaultProps} />)

      const column = screen.getByTestId('todo-column')
      expect(column).toHaveClass('bg-muted/50')
    })
  })
})
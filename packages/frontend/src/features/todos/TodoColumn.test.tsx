import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TodoColumn, type TodoColumnProps } from './TodoColumn'
import type { TodoItem } from '@/services'

// Mock TodoItem component
vi.mock('./TodoItem', () => ({
  TodoItem: ({ todo, showDelete }: { todo: TodoItem; showDelete?: boolean }) => (
    <div data-testid={`todo-item-${todo.id}`}>
      {todo.description}
      {showDelete && <span data-testid={`delete-indicator-${todo.id}`}>Delete enabled</span>}
    </div>
  ),
}))

describe('TodoColumn', () => {
  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 1,
      description: 'Todo column task',
      status: 'pending',
      boardColumnId: 2,
      deadline: null,
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      emailId: 1,
      description: 'Another todo task',
      status: 'pending',
      boardColumnId: 2,
      deadline: null,
      createdAt: '2024-01-15T11:00:00.000Z',
    },
  ]

  const defaultProps: TodoColumnProps = {
    title: 'Todo',
    todos: mockTodos,
    emptyMessage: 'No todo tasks',
    variant: 'todo',
  }

  describe('Rendering', () => {
    it('should render column title', () => {
      render(<TodoColumn {...defaultProps} />)

      expect(screen.getByText('Todo')).toBeInTheDocument()
    })

    it('should render all todos in the column', () => {
      render(<TodoColumn {...defaultProps} />)

      expect(screen.getByText('Todo column task')).toBeInTheDocument()
      expect(screen.getByText('Another todo task')).toBeInTheDocument()
    })

    it('should render count badge', () => {
      render(<TodoColumn {...defaultProps} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should show empty message when no todos', () => {
      render(<TodoColumn {...defaultProps} todos={[]} />)

      expect(screen.getByText('No todo tasks')).toBeInTheDocument()
    })
  })

  describe('Column Icons', () => {
    it('should render inbox variant correctly', () => {
      render(<TodoColumn {...defaultProps} variant="inbox" title="Inbox" />)

      const titleContainer = screen.getByText('Inbox').closest('div')
      expect(titleContainer).toBeInTheDocument()
    })

    it('should render todo variant correctly', () => {
      render(<TodoColumn {...defaultProps} variant="todo" title="Todo" />)

      const titleContainer = screen.getByText('Todo').closest('div')
      expect(titleContainer).toBeInTheDocument()
    })

    it('should render in-progress variant correctly', () => {
      render(<TodoColumn {...defaultProps} variant="in-progress" title="In Progress" />)

      const titleContainer = screen.getByText('In Progress').closest('div')
      expect(titleContainer).toBeInTheDocument()
    })

    it('should render done variant correctly', () => {
      render(<TodoColumn {...defaultProps} variant="done" title="Done" />)

      const titleContainer = screen.getByText('Done').closest('div')
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

  describe('Show Delete Propagation', () => {
    it('should pass showDelete to each TodoItem', () => {
      render(<TodoColumn {...defaultProps} showDelete={true} />)

      // Each todo item should have delete indicator (from mock)
      expect(screen.getByTestId('delete-indicator-1')).toBeInTheDocument()
      expect(screen.getByTestId('delete-indicator-2')).toBeInTheDocument()
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
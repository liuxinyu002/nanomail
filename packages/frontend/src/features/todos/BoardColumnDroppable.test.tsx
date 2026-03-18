import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoardColumnDroppable, type BoardColumnDroppableProps } from './BoardColumnDroppable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'

// Mock @dnd-kit/core
const mockUseDroppable = vi.fn()
vi.mock('@dnd-kit/core', () => ({
  useDroppable: (...args: unknown[]) => mockUseDroppable(...args),
}))

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  verticalListSortingStrategy: {},
}))

// Mock DraggableTodoItem
vi.mock('./DraggableTodoItem', () => ({
  DraggableTodoItem: ({ todo }: { todo: { id: number; title: string } }) => (
    <div data-testid={`todo-item-${todo.id}`}>{todo.title}</div>
  ),
}))

// Mock ColumnHeader
vi.mock('./ColumnHeader', () => ({
  ColumnHeader: ({ column, itemCount }: { column: { name: string }; itemCount: number }) => (
    <div data-testid="column-header">
      <span>{column.name}</span>
      <span>{itemCount} items</span>
    </div>
  ),
}))

describe('BoardColumnDroppable', () => {
  const mockColumn: BoardColumn = {
    id: 2,
    name: 'Todo',
    color: null,
    order: 1,
    isSystem: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  const mockTodos: TodoItem[] = [
    { id: 1, title: 'Task 1', description: '', completed: false, boardColumnId: 2, position: 0, createdAt: new Date(), updatedAt: new Date() } as TodoItem,
    { id: 2, title: 'Task 2', description: '', completed: false, boardColumnId: 2, position: 1, createdAt: new Date(), updatedAt: new Date() } as TodoItem,
  ]

  const defaultProps: BoardColumnDroppableProps = {
    column: mockColumn,
    todos: mockTodos,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation - not being dragged over
    mockUseDroppable.mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
    })
  })

  describe('Rendering', () => {
    it('should render the column header', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      expect(screen.getByTestId('column-header')).toBeInTheDocument()
    })

    it('should render all todos', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
    })

    it('should render droppable zone', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      expect(screen.getByTestId('droppable-zone')).toBeInTheDocument()
    })

    it('should render empty column when no todos', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.getByTestId('droppable-zone')).toBeInTheDocument()
      expect(screen.queryByTestId(/todo-item-/)).not.toBeInTheDocument()
    })
  })

  describe('Background Color - Purified Column', () => {
    it('should always use fixed neutral background #F7F8FA regardless of column color', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#DBEAFE' }} />)

      const column = screen.getByTestId('board-column-droppable')
      // Column should use fixed background color, not dynamic color
      expect(column).toHaveStyle({ backgroundColor: '#F7F8FA' })
    })

    it('should use fixed background #F7F8FA when column has no color', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: null }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveStyle({ backgroundColor: '#F7F8FA' })
    })

    it('should not apply dynamic column color to background', () => {
      const colors = ['#FFB5BA', '#FFD8A8', '#B8E6C1', '#B8D4FF', '#D4B8FF']

      colors.forEach(color => {
        const { unmount } = render(
          <BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color }} />
        )

        const column = screen.getByTestId('board-column-droppable')
        // Should always be #F7F8FA, not the column's color
        expect(column).toHaveStyle({ backgroundColor: '#F7F8FA' })
        expect(column).not.toHaveStyle({ backgroundColor: color })
        unmount()
      })
    })

    it('should not have bg-gray-50 class (uses inline style instead)', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: null }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).not.toHaveClass('bg-gray-50')
    })
  })

  describe('Column Padding', () => {
    it('should have p-3 padding on the column container', () => {
      render(<BoardColumnDroppable {...defaultProps} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('p-3')
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(<BoardColumnDroppable {...defaultProps} className="custom-class" />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('custom-class')
    })

    it('should merge custom className with default classes', () => {
      render(<BoardColumnDroppable {...defaultProps} className="mt-4 rounded-xl" />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('mt-4')
      expect(column).toHaveClass('rounded-xl')
      expect(column).toHaveClass('flex')
    })
  })

  describe('Empty State', () => {
    it('should show EmptyState when column is empty and not being dragged over', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should show EmptyState with column name in message', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} column={{ ...mockColumn, name: 'In Progress' }} />)

      expect(screen.getByText(/No tasks in In Progress/)).toBeInTheDocument()
    })

    it('should NOT show EmptyState when column has todos', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={mockTodos} />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('should NOT show EmptyState when being dragged over (isOver=true)', () => {
      // Override mock for this test to simulate drag over
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })

    it('should show drop indicator when being dragged over empty column', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      // Should show drop indicator
      expect(screen.getByTestId('drop-indicator')).toBeInTheDocument()
    })

    it('should NOT show drop indicator when not being dragged over', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={[]} />)

      expect(screen.queryByTestId('drop-indicator')).not.toBeInTheDocument()
    })

    it('should NOT show drop indicator when column has todos (even if being dragged over)', () => {
      mockUseDroppable.mockReturnValueOnce({
        setNodeRef: vi.fn(),
        isOver: true,
      })

      render(<BoardColumnDroppable {...defaultProps} todos={mockTodos} />)

      expect(screen.queryByTestId('drop-indicator')).not.toBeInTheDocument()
    })

    it('should render todo items when column is not empty', () => {
      render(<BoardColumnDroppable {...defaultProps} todos={mockTodos} />)

      expect(screen.getByTestId('todo-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('todo-item-2')).toBeInTheDocument()
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })
})

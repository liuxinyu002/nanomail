import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoardColumnDroppable, type BoardColumnDroppableProps } from './BoardColumnDroppable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
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

  describe('Background Color', () => {
    it('should apply default gray background when column has no color', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: null }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('bg-gray-50')
    })

    it('should apply column color as background when color is set', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#DBEAFE' }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveStyle({ backgroundColor: '#DBEAFE' })
    })

    it('should not apply bg-gray-50 when custom color is set', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#D1FAE5' }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).not.toHaveClass('bg-gray-50')
    })

    it('should apply different colors correctly', () => {
      const { rerender } = render(
        <BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#FEF3C7' }} />
      )

      let column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveStyle({ backgroundColor: '#FEF3C7' })

      // Rerender with different color
      rerender(
        <BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#EDE9FE' }} />
      )

      column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveStyle({ backgroundColor: '#EDE9FE' })
    })

    it('should handle preset colors from ColorPicker', () => {
      const presetColors = [
        '#E5E7EB', // Gray
        '#DBEAFE', // Blue
        '#D1FAE5', // Green
        '#FEF3C7', // Yellow
        '#EDE9FE', // Purple
        '#FCE7F3', // Pink
      ]

      presetColors.forEach(color => {
        const { unmount } = render(
          <BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color }} />
        )

        const column = screen.getByTestId('board-column-droppable')
        expect(column).toHaveStyle({ backgroundColor: color })
        unmount()
      })
    })

    it('should fallback to gray for invalid hex colors', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: 'invalid' }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('bg-gray-50')
    })

    it('should fallback to gray for colors without # prefix', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: 'DBEAFE' }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('bg-gray-50')
    })

    it('should fallback to gray for 3-character hex colors', () => {
      render(<BoardColumnDroppable {...defaultProps} column={{ ...mockColumn, color: '#ABC' }} />)

      const column = screen.getByTestId('board-column-droppable')
      expect(column).toHaveClass('bg-gray-50')
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
})

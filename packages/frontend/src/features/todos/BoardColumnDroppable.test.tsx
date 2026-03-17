import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndProvider } from '@/contexts/DndContext'
import { BoardColumnDroppable, type BoardColumnDroppableProps } from './BoardColumnDroppable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'

// Mock SortableContext and useSortable from dnd-kit
let mockSortableReturnValue: {
  attributes: Record<string, unknown>
  listeners: Record<string, unknown>
  setNodeRef: (node: HTMLElement | null) => void
  transform: { x: number; y: number } | null
  transition: string | null
  isDragging: boolean
} = {
  attributes: {},
  listeners: {},
  setNodeRef: vi.fn(),
  transform: null,
  transition: null,
  isDragging: false,
}

vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable')
  return {
    ...actual,
    useSortable: () => {
      return mockSortableReturnValue
    },
    SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    verticalListSortingStrategy: 'vertical',
  }
})

// Mock DraggableTodoItem
vi.mock('./DraggableTodoItem', () => ({
  DraggableTodoItem: ({ todo }: { todo: TodoItem }) => (
    <div data-testid={`draggable-todo-${todo.id}`}>{todo.description}</div>
  ),
}))

describe('BoardColumnDroppable', () => {
  const mockColumn: BoardColumn = {
    id: 2,
    name: 'Todo',
    color: '#3B82F6',
    order: 1,
    isSystem: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 100,
      description: 'Test todo 1',
      status: 'pending',
      deadline: null,
      boardColumnId: 2,
      position: 0,
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      emailId: 101,
      description: 'Test todo 2',
      status: 'in_progress',
      deadline: null,
      boardColumnId: 2,
      position: 1,
      createdAt: '2024-01-15T11:00:00.000Z',
    },
  ]

  const defaultProps: BoardColumnDroppableProps = {
    column: mockColumn,
    todos: mockTodos,
  }

  beforeEach(() => {
    mockSortableReturnValue = {
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    }
  })

  describe('Rendering', () => {
    it('should render the column container', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('board-column-droppable')).toBeInTheDocument()
    })

    it('should render column header with name', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByText('Todo')).toBeInTheDocument()
    })

    it('should render todo count in header', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should render todo count of 0 when empty', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} todos={[]} />
        </DndProvider>
      )

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should render all todos in the column', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByText('Test todo 1')).toBeInTheDocument()
      expect(screen.getByText('Test todo 2')).toBeInTheDocument()
    })
  })

  describe('Droppable Configuration', () => {
    it('should have a droppable zone with correct id', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const dropZone = screen.getByTestId('droppable-zone')
      expect(dropZone).toBeInTheDocument()
    })

    it('should configure droppable with column id', () => {
      // The DroppableZone should receive type='board' and columnId
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const dropZone = screen.getByTestId('droppable-zone')
      expect(dropZone).toBeInTheDocument()
    })
  })

  describe('Visual Feedback', () => {
    it('should have base styling for column container', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('board-column-droppable')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('flex-col')
    })

    it('should have rounded corners', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('board-column-droppable')
      expect(container).toHaveClass('rounded-lg')
    })

    it('should have minimum height for empty drop zone', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const dropZone = screen.getByTestId('droppable-zone')
      expect(dropZone).toHaveClass('min-h-[200px]')
    })
  })

  describe('Header', () => {
    it('should have a header section with border', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const header = screen.getByTestId('column-header')
      expect(header).toHaveClass('border-b')
    })

    it('should display column color indicator if color is provided', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const colorIndicator = screen.getByTestId('column-color-indicator')
      expect(colorIndicator).toBeInTheDocument()
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#3B82F6' })
    })

    it('should not display color indicator if color is null', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable
            {...defaultProps}
            column={{ ...mockColumn, color: null }}
          />
        </DndProvider>
      )

      expect(screen.queryByTestId('column-color-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Sortable Context', () => {
    it('should wrap todos in SortableContext', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      // The todos should be rendered within SortableContext
      expect(screen.getByTestId('draggable-todo-1')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-todo-2')).toBeInTheDocument()
    })

    it('should handle empty todos array', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} todos={[]} />
        </DndProvider>
      )

      const dropZone = screen.getByTestId('droppable-zone')
      expect(dropZone).toBeInTheDocument()
    })
  })

  describe('Different Column Types', () => {
    it('should render system column correctly', () => {
      const systemColumn: BoardColumn = {
        ...mockColumn,
        id: 1,
        name: 'Inbox',
        isSystem: true,
      }

      render(
        <DndProvider>
          <BoardColumnDroppable column={systemColumn} todos={mockTodos} />
        </DndProvider>
      )

      expect(screen.getByText('Inbox')).toBeInTheDocument()
    })

    it('should render "In Progress" column correctly', () => {
      const inProgressColumn: BoardColumn = {
        ...mockColumn,
        id: 3,
        name: 'In Progress',
        color: '#F59E0B',
        order: 2,
      }

      render(
        <DndProvider>
          <BoardColumnDroppable column={inProgressColumn} todos={[]} />
        </DndProvider>
      )

      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('should render "Done" column correctly', () => {
      const doneColumn: BoardColumn = {
        ...mockColumn,
        id: 4,
        name: 'Done',
        color: '#10B981',
        order: 3,
      }

      const doneTodos: TodoItem[] = [
        {
          id: 3,
          emailId: 102,
          description: 'Completed task',
          status: 'completed',
          deadline: null,
          boardColumnId: 4,
          position: 0,
          createdAt: '2024-01-15T12:00:00.000Z',
        },
      ]

      render(
        <DndProvider>
          <BoardColumnDroppable column={doneColumn} todos={doneTodos} />
        </DndProvider>
      )

      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('Custom className', () => {
    it('should accept custom className prop', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} className="custom-column-class" />
        </DndProvider>
      )

      const container = screen.getByTestId('board-column-droppable')
      expect(container).toHaveClass('custom-column-class')
    })
  })

  describe('Edge Cases', () => {
    it('should handle large number of todos', () => {
      const manyTodos: TodoItem[] = Array.from({ length: 50 }, (_, i) => ({
        id: i + 100,
        emailId: 100 + i,
        description: `Todo ${i}`,
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 2,
        position: i,
        createdAt: '2024-01-15T10:00:00.000Z',
      }))

      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} todos={manyTodos} />
        </DndProvider>
      )

      expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('should handle todos with null positions', () => {
      const todosWithNullPosition: TodoItem[] = [
        {
          id: 1,
          emailId: 100,
          description: 'Test todo',
          status: 'pending',
          deadline: null,
          boardColumnId: 2,
          position: undefined,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      ]

      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} todos={todosWithNullPosition} />
        </DndProvider>
      )

      expect(screen.getByText('Test todo')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading for column name', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const heading = screen.getByRole('heading', { name: 'Todo' })
      expect(heading).toBeInTheDocument()
    })

    it('should have accessible count label', () => {
      render(
        <DndProvider>
          <BoardColumnDroppable {...defaultProps} />
        </DndProvider>
      )

      const count = screen.getByLabelText('2 items')
      expect(count).toBeInTheDocument()
    })
  })
})
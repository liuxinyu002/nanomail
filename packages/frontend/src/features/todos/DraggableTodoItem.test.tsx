import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndProvider } from '@/contexts/DndContext'
import { DraggableTodoItem, type DraggableTodoItemProps } from './DraggableTodoItem'
import type { TodoItem } from '@/services'

// Mock the TodoItem component
const mockTodoItemRender = vi.fn()
vi.mock('./TodoItem', () => ({
  TodoItem: ({
    todo,
    showDelete,
    ordinal,
    dragHandleProps,
  }: {
    todo: TodoItem
    showDelete?: boolean
    ordinal?: number
    dragHandleProps?: Record<string, unknown>
  }) => {
    mockTodoItemRender({ todo, showDelete, ordinal, dragHandleProps })
    return (
      <div
        data-testid="todo-item-mock"
        data-show-delete={showDelete}
        data-ordinal={ordinal}
        data-has-drag-props={!!dragHandleProps}
      >
        {todo.description}
      </div>
    )
  },
}))

// Store for captured useSortable arguments and return values
let capturedSortableArgs: unknown = null
let mockReturnValue: {
  attributes: Record<string, unknown>
  listeners: Record<string, unknown>
  setNodeRef: (node: HTMLElement | null) => void
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null
  transition: string
  isDragging: boolean
} = {
  attributes: {
    role: 'button',
    tabIndex: 0,
  },
  listeners: {},
  setNodeRef: vi.fn(),
  transform: null,
  transition: '',
  isDragging: false,
}

// Mock useSortable from @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (args: unknown) => {
    capturedSortableArgs = args
    return mockReturnValue
  },
  verticalListSortingStrategy: {},
}))

// Mock CSS utilities
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: (transform: { x: number; y: number; scaleX: number; scaleY: number } | null) =>
        transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scaleX}, ${transform.scaleY})` : '',
    },
  },
}))

describe('DraggableTodoItem', () => {
  const mockTodo: TodoItem = {
    id: 1,
    emailId: 100,
    description: 'Test todo item',
    status: 'pending',
    boardColumnId: 2,
    deadline: null,
    notes: null,
    createdAt: '2024-01-15T10:00:00.000Z',
  }

  const defaultProps: DraggableTodoItemProps = {
    todo: mockTodo,
  }

  beforeEach(() => {
    capturedSortableArgs = null
    mockReturnValue = {
      attributes: {
        role: 'button',
        tabIndex: 0,
      },
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: '',
      isDragging: false,
    }
    mockTodoItemRender.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the todo item', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('todo-item-mock')).toBeInTheDocument()
      expect(screen.getByText('Test todo item')).toBeInTheDocument()
    })

    it('should render with a container that can be dragged', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container).toBeInTheDocument()
    })

    it('should pass todo id to useSortable', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      expect(capturedSortableArgs).toEqual(
        expect.objectContaining({
          id: 1,
        })
      )
    })

    it('should pass todo data to useSortable', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      expect(capturedSortableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'todo',
            todo: mockTodo,
          }),
        })
      )
    })
  })

  describe('Drag State Styling', () => {
    it('should not have opacity-50 when not dragging', () => {
      mockReturnValue = {
        ...mockReturnValue,
        isDragging: false,
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container).not.toHaveClass('opacity-50')
    })

    it('should have opacity-50 when dragging', () => {
      mockReturnValue = {
        ...mockReturnValue,
        isDragging: true,
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container).toHaveClass('opacity-50')
    })

    it('should apply transform style when transform is provided', () => {
      mockReturnValue = {
        ...mockReturnValue,
        transform: { x: 10, y: 20, scaleX: 1, scaleY: 1 },
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container.style.transform).toBe('translate3d(10px, 20px, 0) scale(1, 1)')
    })

    it('should not apply transform when transform is null', () => {
      mockReturnValue = {
        ...mockReturnValue,
        transform: null,
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container.style.transform).toBe('')
    })

    it('should apply transition style for smooth displacement animation', () => {
      mockReturnValue = {
        ...mockReturnValue,
        transition: 'transform 200ms ease',
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container.style.transition).toBe('transform 200ms ease')
    })
  })

  describe('Phase 3: Sortable Drop Indicator (useSortable)', () => {
    it('should use useSortable hook for sortable drag behavior', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      // useSortable should be called with the todo id
      expect(capturedSortableArgs).toEqual(
        expect.objectContaining({
          id: mockTodo.id,
        })
      )
    })

    it('should apply CSS.Transform for sortable displacement (not CSS.Translate)', () => {
      // CSS.Transform includes scale for sortable animations
      mockReturnValue = {
        ...mockReturnValue,
        transform: { x: 0, y: 50, scaleX: 1, scaleY: 1 },
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      // Should use CSS.Transform.toString (includes scale)
      expect(container.style.transform).toContain('translate3d')
      expect(container.style.transform).toContain('scale')
    })

    it('should have transition property enabled for smooth drop indicator animation', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      // Transition should be applied (even if empty string, the property is set)
      expect(container.style.transition).toBeDefined()
    })

    it('should maintain consistent styling during sortable drag operations', () => {
      // When dragging another item, this item should smoothly displace
      mockReturnValue = {
        ...mockReturnValue,
        transform: { x: 0, y: 60, scaleX: 1, scaleY: 1 }, // Displaced down by 60px
        transition: 'transform 250ms ease',
        isDragging: false,
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      // Should show displaced position
      expect(container.style.transform).toBe('translate3d(0px, 60px, 0) scale(1, 1)')
      // Should have smooth transition
      expect(container.style.transition).toBe('transform 250ms ease')
      // Should NOT have opacity-50 (not the item being dragged)
      expect(container).not.toHaveClass('opacity-50')
    })
  })

  describe('Different Todo States', () => {
    it('should render completed todo correctly', () => {
      const completedTodo: TodoItem = {
        ...mockTodo,
        status: 'completed',
      }

      render(
        <DndProvider>
          <DraggableTodoItem todo={completedTodo} />
        </DndProvider>
      )

      expect(screen.getByTestId('todo-item-mock')).toBeInTheDocument()
    })

    it('should render todo with deadline correctly', () => {
      const todoWithDeadline: TodoItem = {
        ...mockTodo,
        deadline: '2024-12-31T23:59:59.000Z',
      }

      render(
        <DndProvider>
          <DraggableTodoItem todo={todoWithDeadline} />
        </DndProvider>
      )

      expect(screen.getByTestId('todo-item-mock')).toBeInTheDocument()
    })

    it('should render todo with different boardColumnId', () => {
      const inboxTodo: TodoItem = {
        ...mockTodo,
        boardColumnId: 1,
      }

      render(
        <DndProvider>
          <DraggableTodoItem todo={inboxTodo} />
        </DndProvider>
      )

      expect(capturedSortableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            todo: expect.objectContaining({
              boardColumnId: 1,
            }),
          }),
        })
      )
    })
  })

  describe('showDelete prop', () => {
    it('should pass showDelete=true to TodoItem when showDelete prop is true', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} showDelete={true} />
        </DndProvider>
      )

      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          showDelete: true,
        })
      )
    })

    it('should pass showDelete=false to TodoItem when showDelete prop is false', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} showDelete={false} />
        </DndProvider>
      )

      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          showDelete: false,
        })
      )
    })

    it('should not pass showDelete to TodoItem by default (undefined)', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      // By default, showDelete should be undefined (falls back to TodoItem default)
      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          showDelete: undefined,
        })
      )
    })

    it('should render the mock with correct data-show-delete attribute when showDelete=true', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} showDelete={true} />
        </DndProvider>
      )

      const todoItemMock = screen.getByTestId('todo-item-mock')
      expect(todoItemMock).toHaveAttribute('data-show-delete', 'true')
    })
  })

  describe('Phase 2: Ordinal and Drag Handle Props', () => {
    it('should pass ordinal prop to TodoItem when index is provided', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} index={0} />
        </DndProvider>
      )

      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          ordinal: 1,
        })
      )
    })

    it('should calculate ordinal correctly (index + 1)', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} index={4} />
        </DndProvider>
      )

      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          ordinal: 5,
        })
      )
    })

    it('should pass dragHandleProps to TodoItem', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} index={0} />
        </DndProvider>
      )

      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          dragHandleProps: expect.objectContaining({
            role: 'button',
          }),
        })
      )
    })

    it('should combine attributes and listeners in dragHandleProps', () => {
      // Set up mock with listeners
      mockReturnValue = {
        ...mockReturnValue,
        listeners: { onPointerDown: vi.fn() },
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} index={0} />
        </DndProvider>
      )

      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          dragHandleProps: expect.objectContaining({
            role: 'button',
            onPointerDown: expect.any(Function),
          }),
        })
      )
    })

    it('should NOT render external drag handle (moved to TodoCardHeader)', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} index={0} />
        </DndProvider>
      )

      // The drag handle should NOT be rendered at DraggableTodoItem level
      // It should be passed down to TodoItem -> TodoCard -> TodoCardHeader
      expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument()
    })

    it('should pass ordinal as undefined when index is not provided', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      expect(mockTodoItemRender).toHaveBeenCalledWith(
        expect.objectContaining({
          ordinal: undefined,
        })
      )
    })
  })
})
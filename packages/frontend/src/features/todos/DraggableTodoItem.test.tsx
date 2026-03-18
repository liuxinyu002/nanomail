import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndProvider } from '@/contexts/DndContext'
import { DraggableTodoItem, type DraggableTodoItemProps } from './DraggableTodoItem'
import type { TodoItem } from '@/services'

// Mock the TodoItem component
vi.mock('./TodoItem', () => ({
  TodoItem: ({ todo }: { todo: TodoItem }) => (
    <div data-testid="todo-item-mock">{todo.description}</div>
  ),
}))

// Store for captured useDraggable arguments and return values
let capturedDraggableArgs: unknown = null
let mockReturnValue: {
  attributes: Record<string, unknown>
  listeners: Record<string, unknown>
  setNodeRef: (node: HTMLElement | null) => void
  transform: { x: number; y: number } | null
  isDragging: boolean
} = {
  attributes: {
    role: 'button',
    tabIndex: 0,
  },
  listeners: {},
  setNodeRef: vi.fn(),
  transform: null,
  isDragging: false,
}

// Mock useDraggable from dnd-kit
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core')
  return {
    ...actual,
    useDraggable: (args: unknown) => {
      capturedDraggableArgs = args
      return mockReturnValue
    },
  }
})

// Mock CSS utilities
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: (transform: { x: number; y: number } | null) =>
        transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : '',
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
    createdAt: '2024-01-15T10:00:00.000Z',
  }

  const defaultProps: DraggableTodoItemProps = {
    todo: mockTodo,
  }

  beforeEach(() => {
    capturedDraggableArgs = null
    mockReturnValue = {
      attributes: {
        role: 'button',
        tabIndex: 0,
      },
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }
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

    it('should pass todo id to useDraggable', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      expect(capturedDraggableArgs).toEqual(
        expect.objectContaining({
          id: 1,
        })
      )
    })

    it('should pass todo data to useDraggable', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      expect(capturedDraggableArgs).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'todo',
            todo: mockTodo,
          }),
        })
      )
    })
  })

  describe('Drag Handle', () => {
    it('should render a drag handle', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('drag-handle')).toBeInTheDocument()
    })

    it('should have cursor-grab class on drag handle', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('cursor-grab')
    })

    it('should have active:cursor-grabbing class on drag handle', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('active:cursor-grabbing')
    })

    it('should have touch-none class on drag handle for touch devices', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('touch-none')
    })
  })

  describe('Phase 5: Drag Handle Hover Visibility', () => {
    it('should have group class on container for hover effect', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container).toHaveClass('group')
    })

    it('should have opacity-0 class on drag handle by default (hidden)', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('opacity-0')
    })

    it('should have group-hover:opacity-100 class on drag handle (visible on hover)', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('group-hover:opacity-100')
    })

    it('should have transition-opacity for smooth appearance', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveClass('transition-opacity')
    })
  })

  describe('Phase 5: Drag Attributes Only on Handle', () => {
    it('should have role="button" on drag handle, not container', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveAttribute('role', 'button')
    })

    it('should NOT have role="button" on container', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container).not.toHaveAttribute('role', 'button')
    })

    it('should have tabIndex on drag handle for keyboard accessibility', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveAttribute('tabIndex', '0')
    })

    it('should NOT have tabIndex on container', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container).not.toHaveAttribute('tabIndex')
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
        transform: { x: 10, y: 20 },
      }

      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const container = screen.getByTestId('draggable-todo-item')
      expect(container.style.transform).toBe('translate3d(10px, 20px, 0)')
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
  })

  describe('Accessibility', () => {
    it('should have role button on drag handle for keyboard users', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveAttribute('role', 'button')
    })

    it('should be focusable via drag handle', () => {
      render(
        <DndProvider>
          <DraggableTodoItem {...defaultProps} />
        </DndProvider>
      )

      const dragHandle = screen.getByTestId('drag-handle')
      expect(dragHandle).toHaveAttribute('tabIndex', '0')
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

      expect(capturedDraggableArgs).toEqual(
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
})
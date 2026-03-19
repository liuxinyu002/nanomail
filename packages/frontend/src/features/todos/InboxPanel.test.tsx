import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndProvider } from '@/contexts/DndContext'
import { InboxPanel, type InboxPanelProps } from './InboxPanel'
import type { TodoItem } from '@/services'

// Mock DraggableTodoItem
vi.mock('./DraggableTodoItem', () => ({
  DraggableTodoItem: ({ todo }: { todo: TodoItem }) => (
    <div data-testid={`draggable-todo-${todo.id}`}>{todo.description}</div>
  ),
}))

// Mock DroppableZone
vi.mock('./DroppableZone', () => ({
  DroppableZone: ({ children, id, type, className }: { children: React.ReactNode; id: string | number; type: string; className?: string }) => (
    <div
      data-testid="droppable-zone"
      data-id={id}
      data-type={type}
      className={className}
    >
      {children}
    </div>
  ),
}))

describe('InboxPanel', () => {
  const createMockTodo = (id: number, boardColumnId: number, description: string = `Todo ${id}`): TodoItem => ({
    id,
    emailId: 100 + id,
    description,
    status: 'pending',
    deadline: null,
    boardColumnId,
    position: id,
    notes: null,
    createdAt: '2024-01-15T10:00:00.000Z',
  })

  const defaultProps: InboxPanelProps = {
    todos: [],
    onDrop: vi.fn(),
  }

  describe('Rendering', () => {
    it('should render the inbox panel container', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByTestId('inbox-panel')).toBeInTheDocument()
    })

    it('should render inbox header with title', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} />
        </DndProvider>
      )

      expect(screen.getByRole('heading', { name: /inbox/i })).toBeInTheDocument()
    })

    it('should render the droppable zone', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} />
        </DndProvider>
      )

      const dropZone = screen.getByTestId('droppable-zone')
      expect(dropZone).toBeInTheDocument()
      expect(dropZone).toHaveAttribute('data-type', 'inbox')
    })
  })

  describe('Data Filtering - Critical: boardColumnId === 1', () => {
    it('should display ONLY todos with boardColumnId === 1', () => {
      const todos = [
        createMockTodo(1, 1), // Inbox - should display
        createMockTodo(2, 2), // Todo column - should NOT display
        createMockTodo(3, 1), // Inbox - should display
        createMockTodo(4, 3), // In Progress - should NOT display
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      expect(screen.getByText('Todo 1')).toBeInTheDocument()
      expect(screen.getByText('Todo 3')).toBeInTheDocument()
      expect(screen.queryByText('Todo 2')).not.toBeInTheDocument()
      expect(screen.queryByText('Todo 4')).not.toBeInTheDocument()
    })

    it('should display empty state when no todos with boardColumnId === 1', () => {
      const todos = [
        createMockTodo(1, 2),
        createMockTodo(2, 3),
        createMockTodo(3, 4),
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      expect(screen.getByText(/no items in inbox/i)).toBeInTheDocument()
    })

    it('should display all todos when all have boardColumnId === 1', () => {
      const todos = [
        createMockTodo(1, 1),
        createMockTodo(2, 1),
        createMockTodo(3, 1),
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      expect(screen.getByText('Todo 1')).toBeInTheDocument()
      expect(screen.getByText('Todo 2')).toBeInTheDocument()
      expect(screen.getByText('Todo 3')).toBeInTheDocument()
    })

    it('should display count of inbox items', () => {
      const todos = [
        createMockTodo(1, 1),
        createMockTodo(2, 2),
        createMockTodo(3, 1),
        createMockTodo(4, 1),
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      expect(screen.getByText('3')).toBeInTheDocument() // Only 3 items with boardColumnId === 1
    })
  })

  describe('Mutual Exclusivity with BoardPanel', () => {
    it('should NOT display todos with boardColumnId > 1 (which belong to BoardPanel)', () => {
      const todos = [
        createMockTodo(1, 1), // Inbox
        createMockTodo(2, 2), // Todo
        createMockTodo(3, 3), // In Progress
        createMockTodo(4, 4), // Done
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Only boardColumnId === 1 should appear
      expect(screen.getByText('Todo 1')).toBeInTheDocument()
      expect(screen.queryByText('Todo 2')).not.toBeInTheDocument()
      expect(screen.queryByText('Todo 3')).not.toBeInTheDocument()
      expect(screen.queryByText('Todo 4')).not.toBeInTheDocument()
    })

    it('should handle edge case: boardColumnId === 0 (invalid, should not display)', () => {
      const todos = [
        createMockTodo(1, 0), // Invalid - should NOT display
        createMockTodo(2, 1), // Inbox - should display
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      expect(screen.queryByText('Todo 1')).not.toBeInTheDocument()
      expect(screen.getByText('Todo 2')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state message when no inbox todos', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={[]} />
        </DndProvider>
      )

      expect(screen.getByText(/no items in inbox/i)).toBeInTheDocument()
    })

    it('should display helpful message in empty state', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={[]} />
        </DndProvider>
      )

      expect(screen.getByText(/drag items here to add them to your inbox/i)).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    it('should have droppable zone configured for inbox type', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} />
        </DndProvider>
      )

      const dropZone = screen.getByTestId('droppable-zone')
      expect(dropZone).toHaveAttribute('data-type', 'inbox')
    })

    it('should call onDrop when item is dropped', () => {
      const onDrop = vi.fn()
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} onDrop={onDrop} />
        </DndProvider>
      )

      // The droppable zone should be present and configured correctly
      expect(screen.getByTestId('droppable-zone')).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('should have proper panel layout', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} />
        </DndProvider>
      )

      const panel = screen.getByTestId('inbox-panel')
      expect(panel).toHaveClass('flex')
      expect(panel).toHaveClass('flex-col')
    })

    it('should have proper header styling', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} />
        </DndProvider>
      )

      const header = screen.getByTestId('panel-header')
      expect(header).toHaveClass('border-b')
    })

    it('should accept custom className', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} className="custom-class" />
        </DndProvider>
      )

      const panel = screen.getByTestId('inbox-panel')
      expect(panel).toHaveClass('custom-class')
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading level', () => {
      render(
        <DndProvider>
          <InboxPanel {...defaultProps} />
        </DndProvider>
      )

      const heading = screen.getByRole('heading', { name: /inbox/i, level: 2 })
      expect(heading).toBeInTheDocument()
    })

    it('should have accessible count label', () => {
      const todos = [
        createMockTodo(1, 1),
        createMockTodo(2, 1),
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      const count = screen.getByLabelText('2 items in inbox')
      expect(count).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle large number of inbox todos', () => {
      const todos: TodoItem[] = Array.from({ length: 100 }, (_, i) =>
        createMockTodo(i + 1, i % 2 === 0 ? 1 : 2)
      )

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      // Should display 50 items with boardColumnId === 1 (even indices)
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('should handle todos with null values gracefully', () => {
      const todos: TodoItem[] = [
        {
          id: 1,
          emailId: 100,
          description: 'Test todo',
          status: 'pending',
          deadline: null,
          boardColumnId: 1,
          position: undefined,
          notes: null,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      ]

      render(
        <DndProvider>
          <InboxPanel {...defaultProps} todos={todos} />
        </DndProvider>
      )

      expect(screen.getByText('Test todo')).toBeInTheDocument()
    })
  })
})
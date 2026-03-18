import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerTodoCard } from './PlannerTodoCard'
import type { Todo } from '@nanomail/shared'

// Helper to create mock Todo
function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: 100,
    description: 'Test todo',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    position: 0,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('PlannerTodoCard', () => {
  describe('rendering', () => {
    it('renders with correct test id', () => {
      const todo = createMockTodo({ id: 42 })
      render(<PlannerTodoCard todo={todo} />)

      expect(screen.getByTestId('planner-todo-card-42')).toBeInTheDocument()
    })

    it('displays todo description', () => {
      const todo = createMockTodo({ id: 1, description: 'Buy groceries' })
      render(<PlannerTodoCard todo={todo} />)

      expect(screen.getByText('Buy groceries')).toBeInTheDocument()
    })

    it('does NOT display description as separate element - only title', () => {
      const todo = createMockTodo({ id: 1, description: 'Main task title' })
      render(<PlannerTodoCard todo={todo} />)

      // The card should only show the description as the title
      // No separate description element should exist
      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toHaveTextContent('Main task title')
      expect(screen.queryByTestId('todo-description')).not.toBeInTheDocument()
    })
  })

  describe('color bar', () => {
    it('renders a color bar on the left side', () => {
      const todo = createMockTodo({ id: 1, boardColumnId: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('planner-todo-card-color-bar-1')
      expect(colorBar).toBeInTheDocument()
    })

    it('applies gray color for Inbox (boardColumnId: 1)', () => {
      const todo = createMockTodo({ id: 1, boardColumnId: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('planner-todo-card-color-bar-1')
      expect(colorBar).toHaveClass('bg-gray-500')
    })

    it('applies blue color for Todo (boardColumnId: 2)', () => {
      const todo = createMockTodo({ id: 1, boardColumnId: 2 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('planner-todo-card-color-bar-1')
      expect(colorBar).toHaveClass('bg-blue-500')
    })

    it('applies amber color for In Progress (boardColumnId: 3)', () => {
      const todo = createMockTodo({ id: 1, boardColumnId: 3 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('planner-todo-card-color-bar-1')
      expect(colorBar).toHaveClass('bg-amber-500')
    })

    it('applies green color for Done (boardColumnId: 4)', () => {
      const todo = createMockTodo({ id: 1, boardColumnId: 4 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('planner-todo-card-color-bar-1')
      expect(colorBar).toHaveClass('bg-green-500')
    })

    it('applies default gray for unknown boardColumnId', () => {
      const todo = createMockTodo({ id: 1, boardColumnId: 999 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('planner-todo-card-color-bar-1')
      expect(colorBar).toHaveClass('bg-gray-500')
    })
  })

  describe('styling', () => {
    it('has minimal card styling', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      // Card should have basic styling but be minimal
      expect(card).toHaveClass('flex')
      expect(card).toHaveClass('items-center')
    })

    it('color bar has narrow width (3-4px)', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const colorBar = screen.getByTestId('planner-todo-card-color-bar-1')
      // 3-4px = w-1 (4px) in Tailwind
      expect(colorBar).toHaveClass('w-1')
    })

    it('truncates long descriptions to single line', () => {
      const longDescription = 'This is a very long description that should be truncated because it exceeds the available space'
      const todo = createMockTodo({ id: 1, description: longDescription })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      const textElement = screen.getByText(longDescription)
      expect(textElement).toHaveClass('truncate')
    })

    it('applies custom className', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} className="custom-class" />)

      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1 })
      const onClick = vi.fn()

      render(<PlannerTodoCard todo={todo} onClick={onClick} />)

      const card = screen.getByTestId('planner-todo-card-1')
      await user.click(card)

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not throw when clicked without onClick handler', async () => {
      const user = userEvent.setup()
      const todo = createMockTodo({ id: 1 })

      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      // Should not throw
      await user.click(card)
    })

    it('has hover styling', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toHaveClass('hover:bg-gray-50')
    })

    it('has cursor pointer when clickable', () => {
      const todo = createMockTodo({ id: 1 })
      render(<PlannerTodoCard todo={todo} onClick={() => {}} />)

      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toHaveClass('cursor-pointer')
    })
  })

  describe('edge cases', () => {
    it('handles empty description', () => {
      const todo = createMockTodo({ id: 1, description: '' })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toBeInTheDocument()
    })

    it('handles very long description', () => {
      const longDescription = 'A'.repeat(500)
      const todo = createMockTodo({ id: 1, description: longDescription })
      render(<PlannerTodoCard todo={todo} />)

      const card = screen.getByTestId('planner-todo-card-1')
      expect(card).toBeInTheDocument()
    })

    it('handles special characters in description', () => {
      const specialDescription = 'Task with <script>alert("xss")</script> & "quotes"'
      const todo = createMockTodo({ id: 1, description: specialDescription })
      render(<PlannerTodoCard todo={todo} />)

      // React should escape the content
      expect(screen.getByText(specialDescription)).toBeInTheDocument()
    })
  })
})
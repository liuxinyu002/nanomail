import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HourSlot } from './HourSlot'
import type { Todo } from '@nanomail/shared'

// Mock @dnd-kit/core
const mockUseDroppable = vi.fn()
vi.mock('@dnd-kit/core', () => ({
  useDroppable: (options: { id: string }) => mockUseDroppable(options),
}))

// Mock PlannerTodoCard
vi.mock('./PlannerTodoCard', () => ({
  PlannerTodoCard: ({ todo, onClick }: { todo: Todo; onClick?: () => void }) => (
    <div
      data-testid={`planner-todo-card-${todo.id}`}
      onClick={onClick}
      className="planner-todo-card-mock"
    >
      {todo.description}
    </div>
  ),
}))

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
    notes: null,
    color: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('HourSlot', () => {
  const mockDate = new Date(2024, 0, 15)
  const hour = 10

  beforeEach(() => {
    // Default mock implementation
    mockUseDroppable.mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
      active: null,
      over: null,
      node: null,
    })
  })

  describe('rendering', () => {
    it('renders with correct test id', () => {
      render(<HourSlot date={mockDate} hour={hour} todos={[]} />)

      expect(screen.getByTestId('hour-slot-10')).toBeInTheDocument()
    })

    it('renders todos passed to it', () => {
      const todos: Todo[] = [
        createMockTodo({ id: 1, description: 'Task 1' }),
        createMockTodo({ id: 2, description: 'Task 2' }),
      ]

      render(<HourSlot date={mockDate} hour={hour} todos={todos} />)

      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
    })

    it('renders empty slot when no todos', () => {
      render(<HourSlot date={mockDate} hour={hour} todos={[]} />)

      const slot = screen.getByTestId('hour-slot-10')
      expect(slot).toBeEmptyDOMElement()
    })

    it('applies correct height class (60px)', () => {
      render(<HourSlot date={mockDate} hour={hour} todos={[]} />)

      const slot = screen.getByTestId('hour-slot-10')
      expect(slot).toHaveClass('h-[60px]')
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<HourSlot date={mockDate} hour={hour} todos={[]} className="custom-class" />)

      const slot = screen.getByTestId('hour-slot-10')
      expect(slot).toHaveClass('custom-class')
    })

    it('has base styling for border and positioning', () => {
      render(<HourSlot date={mockDate} hour={hour} todos={[]} />)

      const slot = screen.getByTestId('hour-slot-10')
      expect(slot).toHaveClass('relative')
      expect(slot).toHaveClass('border-b')
      expect(slot).toHaveClass('border-gray-200')
    })

    it('applies drag-over styling when isOver is true', () => {
      // Override mock for this test
      mockUseDroppable.mockReturnValue({
        setNodeRef: vi.fn(),
        isOver: true,
        active: null,
        over: null,
        node: null,
      })

      render(<HourSlot date={mockDate} hour={hour} todos={[]} />)

      const slot = screen.getByTestId('hour-slot-10')
      expect(slot).toHaveClass('bg-blue-50')
      expect(slot).toHaveClass('ring-2')
      expect(slot).toHaveClass('ring-blue-300')
    })

    it('does not apply drag-over styling when isOver is false', () => {
      render(<HourSlot date={mockDate} hour={hour} todos={[]} />)

      const slot = screen.getByTestId('hour-slot-10')
      expect(slot).not.toHaveClass('bg-blue-50')
      expect(slot).not.toHaveClass('ring-2')
    })
  })

  describe('interactions', () => {
    it('calls onTodoClick when todo is clicked', async () => {
      const user = userEvent.setup()
      const mockTodo = createMockTodo({ id: 1, description: 'Clickable task' })
      const onTodoClick = vi.fn()

      render(<HourSlot date={mockDate} hour={hour} todos={[mockTodo]} onTodoClick={onTodoClick} />)

      const todoCard = screen.getByTestId('planner-todo-card-1')
      await user.click(todoCard)

      expect(onTodoClick).toHaveBeenCalledWith(mockTodo)
    })
  })

  describe('edge cases', () => {
    it('handles hour 0 (midnight)', () => {
      render(<HourSlot date={mockDate} hour={0} todos={[]} />)

      expect(screen.getByTestId('hour-slot-0')).toBeInTheDocument()
    })

    it('handles hour 23 (late night)', () => {
      render(<HourSlot date={mockDate} hour={23} todos={[]} />)

      expect(screen.getByTestId('hour-slot-23')).toBeInTheDocument()
    })

    it('handles many todos in the same slot', () => {
      const todos: Todo[] = Array.from({ length: 10 }, (_, i) =>
        createMockTodo({ id: i + 1, description: `Task ${i + 1}` })
      )

      render(<HourSlot date={mockDate} hour={hour} todos={todos} />)

      todos.forEach((todo) => {
        expect(screen.getByText(todo.description)).toBeInTheDocument()
      })
    })
  })

  describe('dnd-kit integration', () => {
    it('calls useDroppable with correct id format', () => {
      // Use a date that's consistent across timezones
      const testDate = new Date('2024-01-15T12:00:00')
      render(<HourSlot date={testDate} hour={hour} todos={[]} />)

      expect(mockUseDroppable).toHaveBeenCalled()
      const callArgs = mockUseDroppable.mock.calls[0][0]
      // The ID format is hour-{YYYY-MM-DD}-{hour}
      expect(callArgs.id).toMatch(/^hour-2024-01-1[45]-10$/) // Allow for timezone offset
      expect(callArgs.data.hour).toBe(10)
    })

    it('passes type: "planner" in droppable data', () => {
      const testDate = new Date('2024-01-15T12:00:00')
      render(<HourSlot date={testDate} hour={hour} todos={[]} />)

      expect(mockUseDroppable).toHaveBeenCalled()
      const callArgs = mockUseDroppable.mock.calls[0][0]
      expect(callArgs.data.type).toBe('planner')
    })

    it('passes date string in YYYY-MM-DD format', () => {
      const testDate = new Date('2024-01-15T12:00:00')
      render(<HourSlot date={testDate} hour={hour} todos={[]} />)

      expect(mockUseDroppable).toHaveBeenCalled()
      const callArgs = mockUseDroppable.mock.calls[0][0]
      // Date should be in YYYY-MM-DD format
      expect(callArgs.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('uses timezone-safe date formatting (consistent with date-fns)', () => {
      // Test that the date formatting is timezone-safe
      // Using a date that would differ across timezone boundaries
      const testDate = new Date(2024, 0, 15) // Jan 15, 2024 local time
      render(<HourSlot date={testDate} hour={hour} todos={[]} />)

      expect(mockUseDroppable).toHaveBeenCalled()
      const callArgs = mockUseDroppable.mock.calls[0][0]

      // The date should be '2024-01-15' regardless of timezone
      expect(callArgs.data.date).toBe('2024-01-15')
      expect(callArgs.id).toBe('hour-2024-01-15-10')
    })

    it('handles dates near midnight correctly (no timezone drift)', () => {
      // Create a date at 23:00 local time - should still be the same day
      const lateEvening = new Date(2024, 0, 15, 23, 0, 0)
      render(<HourSlot date={lateEvening} hour={0} todos={[]} />)

      expect(mockUseDroppable).toHaveBeenCalled()
      const callArgs = mockUseDroppable.mock.calls[0][0]

      // Should still be 2024-01-15 (not shifted by timezone conversion)
      expect(callArgs.data.date).toBe('2024-01-15')
    })

    it('handles dates near midnight early morning correctly', () => {
      // Create a date at 01:00 local time
      const earlyMorning = new Date(2024, 0, 15, 1, 0, 0)
      render(<HourSlot date={earlyMorning} hour={8} todos={[]} />)

      expect(mockUseDroppable).toHaveBeenCalled()
      const callArgs = mockUseDroppable.mock.calls[0][0]

      // Should still be 2024-01-15
      expect(callArgs.data.date).toBe('2024-01-15')
    })
  })
})
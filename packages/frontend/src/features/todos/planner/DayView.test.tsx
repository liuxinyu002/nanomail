import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { parseISO } from 'date-fns'
import { DayView } from './DayView'
import type { Todo } from '@nanomail/shared'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock the mutation hook used by PlannerTodoCard
vi.mock('@/hooks', () => ({
  useUpdateTodoMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
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

// Helper to create a date at specific hour
function createDateAtHour(year: number, month: number, day: number, hour: number): Date {
  return new Date(year, month - 1, day, hour, 0, 0, 0)
}

describe('DayView', () => {
  // Use parseISO to create consistent dates across timezones
  const mockDate = parseISO('2024-01-15T00:00:00') // January 15, 2024 midnight local

  describe('rendering', () => {
    it('renders 24 hour slots', () => {
      const todos: Todo[] = []
      render(<DayView date={mockDate} todos={todos} />)

      // Should have 24 hour slots (0-23)
      for (let hour = 0; hour < 24; hour++) {
        const hourSlot = screen.getByTestId(`hour-slot-${hour}`)
        expect(hourSlot).toBeInTheDocument()
      }
    })

    it('displays todos in correct hour slots based on deadline', () => {
      // Use local time format to match the mock date
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Morning meeting',
          deadline: '2024-01-15T09:00:00', // 9 AM local time
        }),
        createMockTodo({
          id: 2,
          description: 'Afternoon call',
          deadline: '2024-01-15T14:00:00', // 2 PM local time
        }),
        createMockTodo({
          id: 3,
          description: 'Evening review',
          deadline: '2024-01-15T18:00:00', // 6 PM local time
        }),
      ]

      render(<DayView date={mockDate} todos={todos} />)

      // Check 9 AM slot contains "Morning meeting" (title span)
      const hour9Slot = screen.getByTestId(`hour-slot-9`)
      expect(within(hour9Slot).getAllByText('Morning meeting').length).toBeGreaterThan(0)

      // Check 2 PM (14) slot contains "Afternoon call"
      const hour14Slot = screen.getByTestId(`hour-slot-14`)
      expect(within(hour14Slot).getAllByText('Afternoon call').length).toBeGreaterThan(0)

      // Check 6 PM (18) slot contains "Evening review"
      const hour18Slot = screen.getByTestId(`hour-slot-18`)
      expect(within(hour18Slot).getAllByText('Evening review').length).toBeGreaterThan(0)
    })

    it('shows empty state when no todos for the day', () => {
      const todos: Todo[] = []
      render(<DayView date={mockDate} todos={todos} />)

      // Each hour slot should exist but be empty
      const hourSlots = screen.getAllByTestId(/hour-slot-\d+/)
      expect(hourSlots).toHaveLength(24)
    })

    it('filters todos by date - only shows todos matching the date', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Same day todo',
          deadline: '2024-01-15T10:00:00', // Same day local time
        }),
        createMockTodo({
          id: 2,
          description: 'Different day todo',
          deadline: '2024-01-16T10:00:00', // Next day
        }),
        createMockTodo({
          id: 3,
          description: 'Another day todo',
          deadline: '2024-01-10T10:00:00', // Previous day
        }),
      ]

      render(<DayView date={mockDate} todos={todos} />)

      // Only "Same day todo" should be visible (may appear multiple times)
      expect(screen.getAllByText('Same day todo').length).toBeGreaterThan(0)
      expect(screen.queryByText('Different day todo')).not.toBeInTheDocument()
      expect(screen.queryByText('Another day todo')).not.toBeInTheDocument()
    })

    it('does not show todos with null deadline', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Todo with deadline',
          deadline: '2024-01-15T10:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Todo without deadline',
          deadline: null,
        }),
      ]

      render(<DayView date={mockDate} todos={todos} />)

      expect(screen.getAllByText('Todo with deadline').length).toBeGreaterThan(0)
      expect(screen.queryByText('Todo without deadline')).not.toBeInTheDocument()
    })
  })

  describe('time axis', () => {
    it('renders TimeAxis with 24 hour labels', () => {
      const todos: Todo[] = []
      render(<DayView date={mockDate} todos={todos} />)

      // TimeAxis should render hour labels
      expect(screen.getByTestId('time-axis')).toBeInTheDocument()
    })

    it('renders CurrentTimeIndicator', () => {
      const todos: Todo[] = []
      render(<DayView date={mockDate} todos={todos} />)

      expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
    })
  })

  describe('auto-scroll', () => {
    let originalScrollIntoView: typeof Element.prototype.scrollIntoView

    beforeEach(() => {
      originalScrollIntoView = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = vi.fn()
    })

    afterEach(() => {
      Element.prototype.scrollIntoView = originalScrollIntoView
    })

    it('auto-scrolls to current time - 2 hours on mount', () => {
      // Mock current time to be 10:00 AM
      const now = new Date(2024, 0, 15, 10, 0, 0) // 10 AM
      vi.useFakeTimers()
      vi.setSystemTime(now)

      const todos: Todo[] = []
      render(<DayView date={mockDate} todos={todos} />)

      // Should scroll to hour 8 (10 - 2 = 8)
      const hour8Slot = screen.getByTestId('hour-slot-8')
      expect(hour8Slot.scrollIntoView).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('interactions', () => {
    it('opens popover when todo card is clicked (instead of calling onTodoClick)', async () => {
      const user = userEvent.setup()
      const mockTodo = createMockTodo({
        id: 1,
        description: 'Clickable todo',
        deadline: '2024-01-15T10:00:00', // Local time
      })
      const onTodoClick = vi.fn()

      render(<DayView date={mockDate} todos={[mockTodo]} onTodoClick={onTodoClick} />)

      // Popover should not be visible initially
      expect(screen.queryByTestId('todo-detail-popover')).not.toBeInTheDocument()

      const todoCard = screen.getByTestId('planner-todo-card-1')
      await user.click(todoCard)

      // Popover should now be visible (new behavior)
      expect(screen.getByTestId('todo-detail-popover')).toBeInTheDocument()
      // onTodoClick is no longer called - popover opens instead
      expect(onTodoClick).not.toHaveBeenCalled()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      const todos: Todo[] = []
      render(<DayView date={mockDate} todos={todos} className="custom-class" />)

      const dayView = screen.getByTestId('day-view')
      expect(dayView).toHaveClass('custom-class')
    })

    it('each hour slot has correct height of 60px', () => {
      const todos: Todo[] = []
      render(<DayView date={mockDate} todos={todos} />)

      for (let hour = 0; hour < 24; hour++) {
        const hourSlot = screen.getByTestId(`hour-slot-${hour}`)
        expect(hourSlot).toHaveClass('h-[60px]')
      }
    })
  })

  describe('edge cases', () => {
    it('handles midnight (hour 0) correctly', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Midnight task',
          deadline: '2024-01-15T00:00:00', // Midnight local time
        }),
      ]

      render(<DayView date={mockDate} todos={todos} />)

      const hour0Slot = screen.getByTestId('hour-slot-0')
      expect(within(hour0Slot).getAllByText('Midnight task').length).toBeGreaterThan(0)
    })

    it('handles late night (hour 23) correctly', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Late night task',
          deadline: '2024-01-15T23:00:00', // 11 PM local time
        }),
      ]

      render(<DayView date={mockDate} todos={todos} />)

      const hour23Slot = screen.getByTestId('hour-slot-23')
      expect(within(hour23Slot).getAllByText('Late night task').length).toBeGreaterThan(0)
    })

    it('handles multiple todos in the same hour', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'First task at 10',
          deadline: '2024-01-15T10:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Second task at 10',
          deadline: '2024-01-15T10:30:00',
        }),
        createMockTodo({
          id: 3,
          description: 'Third task at 10',
          deadline: '2024-01-15T10:45:00',
        }),
      ]

      render(<DayView date={mockDate} todos={todos} />)

      const hour10Slot = screen.getByTestId('hour-slot-10')
      expect(within(hour10Slot).getAllByText('First task at 10').length).toBeGreaterThan(0)
      expect(within(hour10Slot).getAllByText('Second task at 10').length).toBeGreaterThan(0)
      expect(within(hour10Slot).getAllByText('Third task at 10').length).toBeGreaterThan(0)
    })

    it('truncates long todo descriptions', () => {
      const longDescription = 'A'.repeat(200)
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: longDescription,
          deadline: '2024-01-15T10:00:00',
        }),
      ]

      render(<DayView date={mockDate} todos={todos} />)

      const todoCard = screen.getByTestId('planner-todo-card-1')
      expect(todoCard).toBeInTheDocument()
    })
  })
})
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns'
import { WeekView } from './WeekView'
import type { Todo } from '@nanomail/shared'

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('WeekView', () => {
  // Week starting Sunday Jan 14, 2024 (Monday is Jan 15)
  const weekStart = startOfWeek(new Date('2024-01-15'), { weekStartsOn: 0 }) // Sunday Jan 14

  describe('rendering', () => {
    it('renders 7 day columns (Sunday to Saturday)', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      // Verify 7 day columns are rendered
      const dayColumns = screen.getAllByTestId(/day-column/)
      expect(dayColumns).toHaveLength(7)
    })

    it('renders TimeAxis on the left side', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      expect(screen.getByTestId('time-axis')).toBeInTheDocument()
    })

    it('renders correct day names in header (Sun-Sat)', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      // Check day names are displayed
      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Mon')).toBeInTheDocument()
      expect(screen.getByText('Tue')).toBeInTheDocument()
      expect(screen.getByText('Wed')).toBeInTheDocument()
      expect(screen.getByText('Thu')).toBeInTheDocument()
      expect(screen.getByText('Fri')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
    })

    it('renders correct dates in header', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      // Check dates are displayed (14, 15, 16, 17, 18, 19, 20)
      expect(screen.getByText('14')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('16')).toBeInTheDocument()
      expect(screen.getByText('17')).toBeInTheDocument()
      expect(screen.getByText('18')).toBeInTheDocument()
      expect(screen.getByText('19')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('renders 24 hour slots for each day column (7 * 24 = 168)', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      // Total hour slots should be 7 * 24 = 168
      const hourSlots = screen.getAllByTestId(/hour-slot-\d+/)
      expect(hourSlots).toHaveLength(168)
    })

    it('has data-testid attribute for each day column with date', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      // Check each day column has the correct date test id
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i)
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayColumn = screen.getByTestId(`day-column-${dateKey}`)
        expect(dayColumn).toBeInTheDocument()
      }
    })
  })

  describe('todo display', () => {
    it('displays todos in correct day and hour slots', () => {
      // Monday Jan 15 at 10:00, Wednesday Jan 17 at 14:00
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Monday morning task',
          deadline: '2024-01-15T10:00:00', // Monday Jan 15, 10 AM
        }),
        createMockTodo({
          id: 2,
          description: 'Wednesday afternoon task',
          deadline: '2024-01-17T14:00:00', // Wednesday Jan 17, 2 PM
        }),
      ]

      render(<WeekView weekStart={weekStart} todos={todos} />)

      // Check Monday task appears in Monday column hour 10 slot
      const mondayColumn = screen.getByTestId('day-column-2024-01-15')
      const hour10Slot = within(mondayColumn).getByTestId('hour-slot-10')
      expect(within(hour10Slot).getByText('Monday morning task')).toBeInTheDocument()

      // Check Wednesday task appears in Wednesday column hour 14 slot
      const wednesdayColumn = screen.getByTestId('day-column-2024-01-17')
      const hour14Slot = within(wednesdayColumn).getByTestId('hour-slot-14')
      expect(within(hour14Slot).getByText('Wednesday afternoon task')).toBeInTheDocument()
    })

    it('handles todos with null deadline - does not display them', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Task with deadline',
          deadline: '2024-01-15T10:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Task without deadline',
          deadline: null,
        }),
      ]

      render(<WeekView weekStart={weekStart} todos={todos} />)

      expect(screen.getByText('Task with deadline')).toBeInTheDocument()
      expect(screen.queryByText('Task without deadline')).not.toBeInTheDocument()
    })

    it('handles todos outside the week - does not display them', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Task in week',
          deadline: '2024-01-15T10:00:00', // Monday Jan 15
        }),
        createMockTodo({
          id: 2,
          description: 'Task outside week',
          deadline: '2024-01-22T10:00:00', // Next Monday
        }),
      ]

      render(<WeekView weekStart={weekStart} todos={todos} />)

      expect(screen.getByText('Task in week')).toBeInTheDocument()
      expect(screen.queryByText('Task outside week')).not.toBeInTheDocument()
    })

    it('handles multiple todos in the same hour slot', () => {
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

      render(<WeekView weekStart={weekStart} todos={todos} />)

      const mondayColumn = screen.getByTestId('day-column-2024-01-15')
      const hour10Slot = within(mondayColumn).getByTestId('hour-slot-10')
      expect(within(hour10Slot).getByText('First task at 10')).toBeInTheDocument()
      expect(within(hour10Slot).getByText('Second task at 10')).toBeInTheDocument()
      expect(within(hour10Slot).getByText('Third task at 10')).toBeInTheDocument()
    })

    it('handles empty todos array', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      // Should still render all 7 day columns and 168 hour slots
      const dayColumns = screen.getAllByTestId(/day-column/)
      expect(dayColumns).toHaveLength(7)

      const hourSlots = screen.getAllByTestId(/hour-slot-\d+/)
      expect(hourSlots).toHaveLength(168)
    })
  })

  describe('current day highlighting', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('highlights the current day column with blue background', () => {
      // Set "today" to Monday Jan 15, 2024
      const today = new Date(2024, 0, 15, 12, 0, 0) // Monday Jan 15
      vi.setSystemTime(today)

      const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 })
      const todos: Todo[] = []

      render(<WeekView weekStart={thisWeekStart} todos={todos} />)

      // Monday column body should have lighter blue background (bg-blue-50/30)
      const mondayColumn = screen.getByTestId('day-column-2024-01-15')
      expect(mondayColumn).toHaveClass('bg-blue-50/30')
    })

    it('does not highlight non-current days', () => {
      const today = new Date(2024, 0, 15, 12, 0, 0) // Monday Jan 15
      vi.setSystemTime(today)

      const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 })
      const todos: Todo[] = []

      render(<WeekView weekStart={thisWeekStart} todos={todos} />)

      // Sunday (non-current) should NOT have blue background in body
      const sundayColumn = screen.getByTestId('day-column-2024-01-14')
      expect(sundayColumn).not.toHaveClass('bg-blue-50/30')
    })

    it('highlights current day header with blue background', () => {
      const today = new Date(2024, 0, 15, 12, 0, 0) // Monday Jan 15
      vi.setSystemTime(today)

      const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 })
      const todos: Todo[] = []

      render(<WeekView weekStart={thisWeekStart} todos={todos} />)

      // Monday header should have blue background (bg-blue-50)
      const mondayHeader = screen.getByTestId('day-header-2024-01-15')
      expect(mondayHeader).toHaveClass('bg-blue-50')
    })
  })

  describe('interactions', () => {
    it('calls onTodoClick when todo card is clicked', async () => {
      const user = userEvent.setup()
      const mockTodo = createMockTodo({
        id: 1,
        description: 'Clickable todo',
        deadline: '2024-01-15T10:00:00',
      })
      const onTodoClick = vi.fn()

      render(<WeekView weekStart={weekStart} todos={[mockTodo]} onTodoClick={onTodoClick} />)

      const todoCard = screen.getByTestId('planner-todo-card-1')
      await user.click(todoCard)

      expect(onTodoClick).toHaveBeenCalledWith(mockTodo)
    })
  })

  describe('styling and layout', () => {
    it('applies custom className', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} className="custom-class" />)

      const weekView = screen.getByTestId('week-view')
      expect(weekView).toHaveClass('custom-class')
    })

    it('has min-w-[140px] on each day column', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      const dayColumns = screen.getAllByTestId(/day-column-/)
      dayColumns.forEach((column) => {
        expect(column).toHaveClass('min-w-[140px]')
      })
    })

    it('has sticky header row', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      const header = screen.getByTestId('week-header')
      expect(header).toHaveClass('sticky')
      expect(header).toHaveClass('top-0')
    })

    it('has horizontal scroll container for day columns', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      const scrollContainer = screen.getByTestId('week-grid')
      expect(scrollContainer).toHaveClass('overflow-x-auto')
    })

    it('each hour slot has correct height of 60px', () => {
      const todos: Todo[] = []
      render(<WeekView weekStart={weekStart} todos={todos} />)

      const hourSlots = screen.getAllByTestId(/hour-slot-\d+/)
      hourSlots.forEach((slot) => {
        expect(slot).toHaveClass('h-[60px]')
      })
    })
  })

  describe('edge cases', () => {
    it('handles week crossing month boundary', () => {
      // Week starting Sunday March 31, 2024
      const weekStart = startOfWeek(new Date('2024-03-31'), { weekStartsOn: 0 })
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'March task',
          deadline: '2024-03-31T10:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'April task',
          deadline: '2024-04-02T14:00:00',
        }),
      ]

      render(<WeekView weekStart={weekStart} todos={todos} />)

      expect(screen.getByText('March task')).toBeInTheDocument()
      expect(screen.getByText('April task')).toBeInTheDocument()
    })

    it('handles midnight (hour 0) and late night (hour 23) correctly', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Midnight task',
          deadline: '2024-01-15T00:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Late night task',
          deadline: '2024-01-15T23:00:00',
        }),
      ]

      render(<WeekView weekStart={weekStart} todos={todos} />)

      const mondayColumn = screen.getByTestId('day-column-2024-01-15')
      const hour0Slot = within(mondayColumn).getByTestId('hour-slot-0')
      const hour23Slot = within(mondayColumn).getByTestId('hour-slot-23')

      expect(within(hour0Slot).getByText('Midnight task')).toBeInTheDocument()
      expect(within(hour23Slot).getByText('Late night task')).toBeInTheDocument()
    })

    it('handles weekStart that is not a Sunday', () => {
      // Pass a Wednesday as weekStart - should still work with 7 days
      const wednesdayStart = new Date('2024-01-17')
      const todos: Todo[] = []

      render(<WeekView weekStart={wednesdayStart} todos={todos} />)

      // Should still render 7 day columns
      const dayColumns = screen.getAllByTestId(/day-column/)
      expect(dayColumns).toHaveLength(7)
    })

    it('handles todos at exactly week boundary (Sunday 00:00 and Saturday 23:59)', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Sunday midnight',
          deadline: '2024-01-14T00:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Saturday late night',
          deadline: '2024-01-20T23:00:00',
        }),
      ]

      render(<WeekView weekStart={weekStart} todos={todos} />)

      const sundayColumn = screen.getByTestId('day-column-2024-01-14')
      const saturdayColumn = screen.getByTestId('day-column-2024-01-20')

      expect(within(sundayColumn).getByText('Sunday midnight')).toBeInTheDocument()
      expect(within(saturdayColumn).getByText('Saturday late night')).toBeInTheDocument()
    })
  })
})
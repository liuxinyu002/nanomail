import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
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

describe('WeekView (Refactored - Single Day Mode)', () => {
  // Reference date: Wednesday, March 18, 2026
  const testDate = new Date(2026, 2, 18) // March 18, 2026 (Wednesday)
  const weekStart = startOfWeek(testDate, { weekStartsOn: 0 }) // Sunday, March 15, 2026

  describe('smart default selection', () => {
    it('defaults to today when current week is displayed', () => {
      vi.useFakeTimers()
      // Set "today" to Wednesday March 18, 2026
      const today = new Date(2026, 2, 18, 12, 0, 0)
      vi.setSystemTime(today)

      const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 })
      const todos: Todo[] = []

      render(<WeekView selectedDate={thisWeekStart} todos={todos} />)

      // WeekDateNav should highlight today (March 18)
      // Wednesday is index 3 (Sun=0, Mon=1, Tue=2, Wed=3)
      const todayButton = screen.getByTestId('date-item-3')
      expect(todayButton).toHaveClass('bg-blue-600')

      vi.useRealTimers()
    })

    it('defaults to first day (Sunday) when non-current week is displayed', () => {
      vi.useFakeTimers()
      // Set "today" to March 18, 2026
      const today = new Date(2026, 2, 18, 12, 0, 0)
      vi.setSystemTime(today)

      // Use a different week (January 2026)
      const differentWeekStart = new Date(2026, 0, 4) // January 4, 2026 (Sunday)
      const todos: Todo[] = []

      render(<WeekView selectedDate={differentWeekStart} todos={todos} />)

      // Should select Sunday (index 0) since it's not the current week
      const sundayButton = screen.getByTestId('date-item-0')
      expect(sundayButton).toHaveClass('bg-blue-600')

      vi.useRealTimers()
    })
  })

  describe('rendering', () => {
    it('renders WeekDateNav component', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} />)

      expect(screen.getByTestId('week-date-nav')).toBeInTheDocument()
    })

    it('renders TimeAxis on the left side', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} />)

      expect(screen.getByTestId('time-axis')).toBeInTheDocument()
    })

    it('renders single day content area (not 7 columns)', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Should NOT have multiple day columns
      const dayColumns = screen.queryAllByTestId(/day-column-/)
      expect(dayColumns).toHaveLength(0)

      // Should have a single day content area
      const dayContent = screen.getByTestId('day-content')
      expect(dayContent).toBeInTheDocument()
    })

    it('renders 24 hour slots for selected date', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Should have exactly 24 hour slots
      const hourSlots = screen.getAllByTestId(/hour-slot-\d+/)
      expect(hourSlots).toHaveLength(24)
    })

    it('displays date in the correct format in day content header', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Should display the selected date in Chinese format (e.g., "3月18日")
      expect(screen.getByText(/3月18日/)).toBeInTheDocument()
    })
  })

  describe('todo display', () => {
    it('displays todos for the selected date only', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Wednesday task',
          deadline: '2026-03-18T10:00:00', // Wednesday March 18
        }),
        createMockTodo({
          id: 2,
          description: 'Thursday task',
          deadline: '2026-03-19T10:00:00', // Thursday March 19
        }),
      ]

      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Only Wednesday task should be visible (may appear multiple times)
      expect(screen.getAllByText('Wednesday task').length).toBeGreaterThan(0)
      expect(screen.queryByText('Thursday task')).not.toBeInTheDocument()
    })

    it('groups todos by hour in the single day view', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Morning task',
          deadline: '2026-03-18T09:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Afternoon task',
          deadline: '2026-03-18T14:00:00',
        }),
      ]

      render(<WeekView selectedDate={testDate} todos={todos} />)

      const dayContent = screen.getByTestId('day-content')
      const hour9Slot = within(dayContent).getByTestId('hour-slot-9')
      const hour14Slot = within(dayContent).getByTestId('hour-slot-14')

      expect(within(hour9Slot).getAllByText('Morning task').length).toBeGreaterThan(0)
      expect(within(hour14Slot).getAllByText('Afternoon task').length).toBeGreaterThan(0)
    })

    it('handles todos with null deadline - does not display them', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Task with deadline',
          deadline: '2026-03-18T10:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Task without deadline',
          deadline: null,
        }),
      ]

      render(<WeekView selectedDate={testDate} todos={todos} />)

      expect(screen.getAllByText('Task with deadline').length).toBeGreaterThan(0)
      expect(screen.queryByText('Task without deadline')).not.toBeInTheDocument()
    })

    it('handles empty todos array', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Should still render 24 hour slots
      const hourSlots = screen.getAllByTestId(/hour-slot-\d+/)
      expect(hourSlots).toHaveLength(24)
    })
  })

  describe('date navigation', () => {
    it('clicking a date in WeekDateNav updates the displayed content', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Wednesday task',
          deadline: '2026-03-18T10:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Thursday task',
          deadline: '2026-03-19T10:00:00',
        }),
      ]

      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Initially shows Wednesday task (may appear multiple times)
      expect(screen.getAllByText('Wednesday task').length).toBeGreaterThan(0)
      expect(screen.queryByText('Thursday task')).not.toBeInTheDocument()

      // Click on Thursday (index 4)
      const thursdayButton = screen.getByTestId('date-item-4')
      await user.click(thursdayButton)

      // Now should show Thursday task (may appear multiple times)
      expect(screen.queryByText('Wednesday task')).not.toBeInTheDocument()
      expect(screen.getAllByText('Thursday task').length).toBeGreaterThan(0)
    })

    it('calls onDateChange when date is selected', async () => {
      const user = userEvent.setup()
      const onDateChange = vi.fn()
      const todos: Todo[] = []

      render(<WeekView selectedDate={testDate} todos={todos} onDateChange={onDateChange} />)

      // Click on Thursday (index 4, March 19)
      const thursdayButton = screen.getByTestId('date-item-4')
      await user.click(thursdayButton)

      expect(onDateChange).toHaveBeenCalledTimes(1)
      const calledDate = onDateChange.mock.calls[0][0]
      expect(calledDate.getDate()).toBe(19)
      expect(calledDate.getMonth()).toBe(2) // March
      expect(calledDate.getFullYear()).toBe(2026)
    })
  })

  describe('week navigation', () => {
    it('clicking left arrow navigates to previous week', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = []

      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Initially shows March 15-21
      expect(screen.getByText('15')).toBeInTheDocument() // Sunday March 15

      // Click left arrow
      const leftArrow = screen.getByRole('button', { name: /上一周/i })
      await user.click(leftArrow)

      // Should show March 8-14 (previous week)
      expect(screen.getByText('8')).toBeInTheDocument() // Sunday March 8
    })

    it('clicking right arrow navigates to next week', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = []

      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Initially shows March 15-21
      expect(screen.getByText('15')).toBeInTheDocument() // Sunday March 15

      // Click right arrow
      const rightArrow = screen.getByRole('button', { name: /下一周/i })
      await user.click(rightArrow)

      // Should show March 22-28 (next week)
      expect(screen.getByText('22')).toBeInTheDocument() // Sunday March 22
    })

    it('navigating to previous week selects first day if not current week', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = []

      render(<WeekView selectedDate={testDate} todos={todos} />)

      // Click left arrow
      const leftArrow = screen.getByRole('button', { name: /上一周/i })
      await user.click(leftArrow)

      // Sunday (index 0) should be selected
      const sundayButton = screen.getByTestId('date-item-0')
      expect(sundayButton).toHaveClass('bg-blue-600')
    })

    it('navigating weeks calls onDateChange with new selected date', async () => {
      const user = userEvent.setup()
      const onDateChange = vi.fn()
      const todos: Todo[] = []

      render(<WeekView selectedDate={testDate} todos={todos} onDateChange={onDateChange} />)

      // Click right arrow
      const rightArrow = screen.getByRole('button', { name: /下一周/i })
      await user.click(rightArrow)

      expect(onDateChange).toHaveBeenCalledTimes(1)
      // Should select first day of next week (March 22, 2026)
      const calledDate = onDateChange.mock.calls[0][0]
      expect(calledDate.getDate()).toBe(22)
    })
  })

  describe('interactions', () => {
    it('calls onTodoClick when todo card is clicked', async () => {
      const user = userEvent.setup()
      const mockTodo = createMockTodo({
        id: 1,
        description: 'Clickable todo',
        deadline: '2026-03-18T10:00:00',
      })
      const onTodoClick = vi.fn()

      render(<WeekView selectedDate={testDate} todos={[mockTodo]} onTodoClick={onTodoClick} />)

      const todoCard = screen.getByTestId('planner-todo-card-1')
      await user.click(todoCard)

      expect(onTodoClick).toHaveBeenCalledWith(mockTodo)
    })
  })

  describe('styling and layout', () => {
    it('applies custom className', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} className="custom-class" />)

      const weekView = screen.getByTestId('week-view')
      expect(weekView).toHaveClass('custom-class')
    })

    it('has proper flex layout structure', () => {
      const todos: Todo[] = []
      render(<WeekView selectedDate={testDate} todos={todos} />)

      const weekView = screen.getByTestId('week-view')
      expect(weekView).toHaveClass('flex')
      expect(weekView).toHaveClass('flex-col')
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
      vi.useRealTimers()
    })

    it('scrolls to current time - 2 hours when showing today', () => {
      vi.useFakeTimers()
      // Set "today" to March 18, 2026 at 10 AM
      const now = new Date(2026, 2, 18, 10, 0, 0)
      vi.setSystemTime(now)

      const today = new Date(2026, 2, 18)
      render(<WeekView selectedDate={today} todos={[]} />)

      // Should scroll to hour 8 (10 - 2 = 8)
      const hour8Slot = screen.getByTestId('hour-slot-8')
      expect(hour8Slot.scrollIntoView).toHaveBeenCalled()
    })

    it('does not scroll when showing non-today date', () => {
      vi.useFakeTimers()
      // Set "today" to March 18, 2026 at 10 AM
      const now = new Date(2026, 2, 18, 10, 0, 0)
      vi.setSystemTime(now)

      // Use a different week where smart default won't return today
      const differentWeekStart = new Date(2026, 0, 4) // January 4, 2026 (Sunday)
      render(<WeekView selectedDate={differentWeekStart} todos={[]} />)

      // Should not scroll for non-today
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    })

    it('scrolls when switching to today from non-today', async () => {
      vi.useFakeTimers()
      const now = new Date(2026, 2, 18, 10, 0, 0)
      vi.setSystemTime(now)

      // Start with a different week (January 2026)
      const differentWeekStart = new Date(2026, 0, 4) // January 4, 2026 (Sunday)
      render(<WeekView selectedDate={differentWeekStart} todos={[]} />)

      // No scroll on non-today week
      expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

      // Navigate to current week by changing selectedDate prop
      const currentWeekStart = new Date(2026, 2, 15) // March 15, 2026 (Sunday)
      const { rerender } = render(
        <WeekView selectedDate={differentWeekStart} todos={[]} />
      )
      rerender(<WeekView selectedDate={currentWeekStart} todos={[]} />)

      // Smart default selects today (March 18), which should trigger scroll
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    })
  })

  describe('CurrentTimeIndicator', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders when showing today', () => {
      vi.useFakeTimers()
      const today = new Date(2026, 2, 18)
      vi.setSystemTime(today)

      render(<WeekView selectedDate={today} todos={[]} />)

      expect(screen.getByTestId('current-time-indicator')).toBeInTheDocument()
    })

    it('does not render when showing non-today date', () => {
      vi.useFakeTimers()
      const yesterday = new Date(2026, 2, 17)
      vi.setSystemTime(new Date(2026, 2, 18))

      // Use a different week where smart default won't return today
      const differentWeekStart = new Date(2026, 0, 4) // January 4, 2026 (Sunday)
      render(<WeekView selectedDate={differentWeekStart} todos={[]} />)

      expect(screen.queryByTestId('current-time-indicator')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles week crossing month boundary', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = []

      // Start with last week of March 2026: March 29 - April 4
      const march29 = new Date(2026, 2, 29)
      const weekStart = startOfWeek(march29, { weekStartsOn: 0 })

      render(<WeekView selectedDate={march29} todos={todos} />)

      // Should display dates from both months
      expect(screen.getByText('29')).toBeInTheDocument() // March 29
      expect(screen.getByText('31')).toBeInTheDocument() // March 31
      expect(screen.getByText('1')).toBeInTheDocument() // April 1
    })

    it('handles week crossing year boundary', async () => {
      const user = userEvent.setup()
      const todos: Todo[] = []

      // Last week of December 2025: Dec 28 - Jan 3
      const dec28 = new Date(2025, 11, 28)
      const weekStart = startOfWeek(dec28, { weekStartsOn: 0 })

      render(<WeekView selectedDate={dec28} todos={todos} />)

      // Should display dates from both years
      expect(screen.getByText('28')).toBeInTheDocument() // Dec 28
      expect(screen.getByText('31')).toBeInTheDocument() // Dec 31
      expect(screen.getByText('1')).toBeInTheDocument() // Jan 1
    })

    it('handles midnight (hour 0) and late night (hour 23) correctly', () => {
      const todos: Todo[] = [
        createMockTodo({
          id: 1,
          description: 'Midnight task',
          deadline: '2026-03-18T00:00:00',
        }),
        createMockTodo({
          id: 2,
          description: 'Late night task',
          deadline: '2026-03-18T23:00:00',
        }),
      ]

      render(<WeekView selectedDate={testDate} todos={todos} />)

      const dayContent = screen.getByTestId('day-content')
      const hour0Slot = within(dayContent).getByTestId('hour-slot-0')
      const hour23Slot = within(dayContent).getByTestId('hour-slot-23')

      expect(within(hour0Slot).getAllByText('Midnight task').length).toBeGreaterThan(0)
      expect(within(hour23Slot).getAllByText('Late night task').length).toBeGreaterThan(0)
    })

    it('handles selectedDate prop change within same week', () => {
      const todos: Todo[] = []
      const { rerender } = render(<WeekView selectedDate={testDate} todos={todos} />)

      // Initially shows March 18
      expect(screen.getByText('18')).toBeInTheDocument()

      // Rerender with different date in same week
      const newDate = new Date(2026, 2, 19) // March 19
      rerender(<WeekView selectedDate={newDate} todos={todos} />)

      // WeekDateNav should update to show March 19 selected
      const thursdayButton = screen.getByTestId('date-item-4')
      expect(thursdayButton).toHaveClass('bg-blue-600')
    })

    it('handles selectedDate prop change to different week', async () => {
      vi.useFakeTimers()
      const today = new Date(2026, 2, 18, 12, 0, 0)
      vi.setSystemTime(today)

      const todos: Todo[] = []
      const { rerender } = render(<WeekView selectedDate={testDate} todos={todos} />)

      // Initially shows March 15-21 week
      expect(screen.getByText('15')).toBeInTheDocument()

      // Rerender with date in different week (January 2026)
      const newDate = new Date(2026, 0, 8) // January 8, 2026 (Thursday)
      rerender(<WeekView selectedDate={newDate} todos={todos} />)

      // Run timers to allow useEffect
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      // Should show January dates (4-10)
      expect(screen.getByText('4')).toBeInTheDocument() // January 4 (Sunday)
      expect(screen.getByText('8')).toBeInTheDocument() // January 8 (Thursday)

      vi.useRealTimers()
    })
  })
})
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { format } from 'date-fns'
import { TodoCalendarGrid, type TodoCalendarGridProps } from './TodoCalendarGrid'
import type { TodoItem } from '@/services'

// Mock CalendarDayCell
vi.mock('./CalendarDayCell', () => ({
  CalendarDayCell: ({ date, isCurrentMonth, isToday, todoCount, highestPriorityColumn, onClick }: {
    date: Date
    isCurrentMonth: boolean
    isToday: boolean
    todoCount: number
    highestPriorityColumn: number | null
    onClick: (date: Date) => void
  }) => (
    <div
      data-testid={`day-cell-${format(date, 'yyyy-MM-dd')}`}
      data-current-month={isCurrentMonth}
      data-is-today={isToday}
      data-todo-count={todoCount}
      data-highest-priority-column={highestPriorityColumn || 'none'}
      onClick={() => onClick(date)}
    >
      {date.getDate()}
    </div>
  ),
}))

describe('TodoCalendarGrid', () => {
  const mockOnDayClick = vi.fn()

  // March 2024 - starts on Friday, ends on Sunday
  const march2024 = new Date('2024-03-15T12:00:00.000Z')

  const mockTodos: TodoItem[] = [
    {
      id: 1,
      emailId: 100,
      description: 'Task on March 15 (Todo column)',
      status: 'pending',
      boardColumnId: 2, // Todo (high priority)
      // Use noon UTC to ensure it's on March 15 in all timezones
      deadline: '2024-03-15T12:00:00.000Z',
      createdAt: '2024-03-01T10:00:00.000Z',
    },
    {
      id: 2,
      emailId: 100,
      description: 'Another task on March 15 (In Progress)',
      status: 'pending',
      boardColumnId: 3, // In Progress (medium priority)
      deadline: '2024-03-15T12:00:00.000Z',
      createdAt: '2024-03-01T10:00:00.000Z',
    },
    {
      id: 3,
      emailId: 100,
      description: 'Completed task on March 15',
      status: 'completed',
      boardColumnId: 1, // Inbox
      deadline: '2024-03-15T12:00:00.000Z',
      createdAt: '2024-03-01T10:00:00.000Z',
    },
    {
      id: 4,
      emailId: 100,
      description: 'Task on March 20',
      status: 'pending',
      boardColumnId: 1, // Inbox (low priority)
      deadline: '2024-03-20T12:00:00.000Z',
      createdAt: '2024-03-01T10:00:00.000Z',
    },
    {
      id: 5,
      emailId: 100,
      description: 'Task in February (overflow)',
      status: 'pending',
      boardColumnId: 3, // In Progress (medium priority)
      deadline: '2024-02-28T12:00:00.000Z',
      createdAt: '2024-02-01T10:00:00.000Z',
    },
  ]

  const defaultProps: TodoCalendarGridProps = {
    currentMonth: march2024,
    todos: mockTodos,
    onDayClick: mockOnDayClick,
  }

  beforeEach(() => {
    mockOnDayClick.mockClear()
  })

  describe('Grid Structure', () => {
    it('should render 42 day cells (6 weeks)', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // Get all elements with data-testid starting with "day-cell-"
      const dayCells = screen.getAllByTestId(/^day-cell-/)
      expect(dayCells).toHaveLength(42)
    })

    it('should render weekday headers', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Mon')).toBeInTheDocument()
      expect(screen.getByText('Tue')).toBeInTheDocument()
      expect(screen.getByText('Wed')).toBeInTheDocument()
      expect(screen.getByText('Thu')).toBeInTheDocument()
      expect(screen.getByText('Fri')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
    })

    it('should render 7 weekday headers', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      weekdays.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })
  })

  describe('Date Calculations', () => {
    it('should start calendar on the Sunday before month start', () => {
      // March 2024 starts on Friday (March 1)
      // Calendar should start on Sunday, Feb 25
      render(<TodoCalendarGrid {...defaultProps} />)

      // Check Feb 25 is rendered (shows as 25 in the cell)
      const feb25 = screen.getByTestId('day-cell-2024-02-25')
      expect(feb25).toBeInTheDocument()
      expect(feb25).toHaveTextContent('25')
    })

    it('should mark dates in current month correctly', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // March 15 should be current month
      const march15 = screen.getByTestId('day-cell-2024-03-15')
      expect(march15).toHaveAttribute('data-current-month', 'true')

      // Feb 25 should not be current month
      const feb25 = screen.getByTestId('day-cell-2024-02-25')
      expect(feb25).toHaveAttribute('data-current-month', 'false')
    })

    it('should mark today correctly', () => {
      // Use current date as the month
      const today = new Date()
      render(<TodoCalendarGrid {...defaultProps} currentMonth={today} />)

      // Find the today cell
      const todayStr = format(today, 'yyyy-MM-dd')
      const todayCell = screen.getByTestId(`day-cell-${todayStr}`)

      expect(todayCell).toHaveAttribute('data-is-today', 'true')
    })
  })

  describe('Todo Count Calculation', () => {
    it('should show correct todo count for a day with todos', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // March 15 has 2 pending todos (1 is completed)
      const march15 = screen.getByTestId('day-cell-2024-03-15')
      expect(march15).toHaveAttribute('data-todo-count', '2')
    })

    it('should show count of 0 for days without todos', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // March 1 has no todos
      const march1 = screen.getByTestId('day-cell-2024-03-01')
      expect(march1).toHaveAttribute('data-todo-count', '0')
    })

    it('should not count completed todos', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // March 15 has 1 completed todo, should show 2 pending
      const march15 = screen.getByTestId('day-cell-2024-03-15')
      expect(march15).toHaveAttribute('data-todo-count', '2')
    })
  })

  describe('Highest Priority Column Calculation', () => {
    it('should show Todo column (2) when day has Todo task', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // March 15 has Todo (2) and In Progress (3) tasks, Todo should win
      const march15 = screen.getByTestId('day-cell-2024-03-15')
      expect(march15).toHaveAttribute('data-highest-priority-column', '2')
    })

    it('should show Inbox column (1) when day has only Inbox task', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // March 20 has only Inbox (1) task
      const march20 = screen.getByTestId('day-cell-2024-03-20')
      expect(march20).toHaveAttribute('data-highest-priority-column', '1')
    })

    it('should show none when day has no todos', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // March 1 has no todos
      const march1 = screen.getByTestId('day-cell-2024-03-01')
      expect(march1).toHaveAttribute('data-highest-priority-column', 'none')
    })

    it('should show In Progress column (3) when day has In Progress task', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      // Feb 28 has In Progress (3) task
      const feb28 = screen.getByTestId('day-cell-2024-02-28')
      expect(feb28).toHaveAttribute('data-highest-priority-column', '3')
    })
  })

  describe('Click Interaction', () => {
    it('should call onDayClick with date and todos when day is clicked', () => {
      render(<TodoCalendarGrid {...defaultProps} />)

      const march15 = screen.getByTestId('day-cell-2024-03-15')
      march15.click()

      expect(mockOnDayClick).toHaveBeenCalledTimes(1)

      const [date, todos] = mockOnDayClick.mock.calls[0]
      expect(format(date, 'yyyy-MM-dd')).toBe('2024-03-15')
      // Should include todos for that day (count may vary by timezone)
      expect(todos.length).toBeGreaterThan(0)
      expect(todos.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty todos array', () => {
      render(<TodoCalendarGrid {...defaultProps} todos={[]} />)

      const dayCells = screen.getAllByTestId(/^day-cell-/)
      dayCells.forEach(cell => {
        expect(cell).toHaveAttribute('data-todo-count', '0')
        expect(cell).toHaveAttribute('data-highest-priority-column', 'none')
      })
    })

    it('should handle todos with null deadline', () => {
      const todosWithNullDeadline: TodoItem[] = [
        {
          id: 1,
          emailId: 100,
          description: 'Task without deadline',
          status: 'pending',
          boardColumnId: 2,
          deadline: null,
          createdAt: '2024-03-01T10:00:00.000Z',
        },
      ]

      render(<TodoCalendarGrid {...defaultProps} todos={todosWithNullDeadline} />)

      // No day should have todos
      const dayCells = screen.getAllByTestId(/^day-cell-/)
      dayCells.forEach(cell => {
        expect(cell).toHaveAttribute('data-todo-count', '0')
      })
    })

    it('should handle February in leap year', () => {
      // February 2024 is a leap year (29 days)
      const feb2024 = new Date('2024-02-15T12:00:00.000Z')

      render(<TodoCalendarGrid {...defaultProps} currentMonth={feb2024} />)

      // Feb 29 should exist
      const feb29 = screen.getByTestId('day-cell-2024-02-29')
      expect(feb29).toBeInTheDocument()
    })

    it('should handle February in non-leap year', () => {
      // February 2023 is not a leap year (28 days)
      const feb2023 = new Date('2023-02-15T12:00:00.000Z')

      render(<TodoCalendarGrid {...defaultProps} currentMonth={feb2023} />)

      // Should still have 42 cells
      const dayCells = screen.getAllByTestId(/^day-cell-/)
      expect(dayCells).toHaveLength(42)
    })
  })
})
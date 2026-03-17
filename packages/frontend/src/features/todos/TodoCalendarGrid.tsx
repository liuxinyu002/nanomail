import {
  startOfMonth,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
  format,
} from 'date-fns'
import { CalendarDayCell } from './CalendarDayCell'
import type { TodoItem } from '@/services'

export interface TodoCalendarGridProps {
  currentMonth: Date
  todos: TodoItem[]
  onDayClick: (date: Date, todos: TodoItem[]) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// Column priority order for sorting (higher number = higher priority)
const COLUMN_PRIORITY: Record<number, number> = {
  2: 3, // Todo (high priority)
  3: 2, // In Progress (medium priority)
  1: 1, // Inbox (low priority)
  4: 0, // Done (lowest)
}

/**
 * TodoCalendarGrid - Renders a 42-day calendar grid (6 weeks)
 *
 * Calculates and displays:
 * - Weekday headers
 * - Day cells with todo counts and column priority indicators
 */
export function TodoCalendarGrid({
  currentMonth,
  todos,
  onDayClick,
}: TodoCalendarGridProps) {
  // Calculate calendar grid boundaries
  const monthStart = startOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
  const calendarEnd = addDays(calendarStart, 41) // 42 days total

  // Generate 42-day array
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Get todos for a specific day (by deadline)
  const getTodosForDay = (date: Date): TodoItem[] => {
    return todos.filter(todo => {
      if (!todo.deadline) return false
      return isSameDay(new Date(todo.deadline), date)
    })
  }

  // Get highest priority column from pending todos
  const getHighestPriorityColumn = (dayTodos: TodoItem[]): number | null => {
    const pendingTodos = dayTodos.filter(t => t.status !== 'completed')
    if (pendingTodos.length === 0) return null

    return pendingTodos.reduce<number>((highest, todo) => {
      const todoPriority = COLUMN_PRIORITY[todo.boardColumnId] ?? 0
      const highestPriority = COLUMN_PRIORITY[highest] ?? 0
      return todoPriority > highestPriority ? todo.boardColumnId : highest
    }, pendingTodos[0].boardColumnId)
  }

  return (
    <>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dayTodos = getTodosForDay(day)
          const pendingTodos = dayTodos.filter(t => t.status !== 'completed')

          return (
            <CalendarDayCell
              key={format(day, 'yyyy-MM-dd')}
              date={day}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              isToday={isTodayFn(day)}
              todoCount={pendingTodos.length}
              highestPriorityColumn={getHighestPriorityColumn(dayTodos)}
              onClick={(date) => onDayClick(date, dayTodos)}
            />
          )
        })}
      </div>
    </>
  )
}
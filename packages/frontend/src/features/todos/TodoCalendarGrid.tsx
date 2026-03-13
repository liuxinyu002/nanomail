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
import type { Urgency } from '@nanomail/shared'
import { CalendarDayCell } from './CalendarDayCell'
import type { TodoItem } from '@/services'

export interface TodoCalendarGridProps {
  currentMonth: Date
  todos: TodoItem[]
  onDayClick: (date: Date, todos: TodoItem[]) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const URGENCY_ORDER: Record<Urgency, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * TodoCalendarGrid - Renders a 42-day calendar grid (6 weeks)
 *
 * Calculates and displays:
 * - Weekday headers
 * - Day cells with todo counts and urgency indicators
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

  // Calculate highest urgency from pending todos
  const getHighestUrgency = (dayTodos: TodoItem[]): Urgency | null => {
    const pendingTodos = dayTodos.filter(t => t.status !== 'completed')
    if (pendingTodos.length === 0) return null

    return pendingTodos.reduce<Urgency>((highest, todo) => {
      return URGENCY_ORDER[todo.urgency] > URGENCY_ORDER[highest]
        ? todo.urgency
        : highest
    }, pendingTodos[0].urgency)
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
              highestUrgency={getHighestUrgency(dayTodos)}
              onClick={(date) => onDayClick(date, dayTodos)}
            />
          )
        })}
      </div>
    </>
  )
}
import { useMemo } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { TimeAxis } from './TimeAxis'
import { HourSlot } from './HourSlot'
import type { Todo } from '@nanomail/shared'

export interface WeekViewProps {
  weekStart: Date  // Should be a Sunday
  todos: Todo[]
  onTodoClick?: (todo: Todo) => void
  className?: string
}

/**
 * WeekView - 7-column week view for the planner scheduler.
 *
 * Features:
 * - Classic calendar-style week view (Sunday to Saturday)
 * - Horizontal scroll for narrow viewports (min-w-[140px] per column)
 * - Sticky header row with day names and dates
 * - Current day column highlighted with subtle blue background
 * - TimeAxis on the left (fixed width)
 * - 24 HourSlots per day column
 * - Todos grouped by date and hour
 */
export function WeekView({ weekStart, todos, onTodoClick, className }: WeekViewProps) {
  // Generate 7 days starting from weekStart (Sunday to Saturday)
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  const today = new Date()

  // Filter todos within the week and group by date and hour
  const todosByDateHour = useMemo(() => {
    const grouped: Record<string, Record<number, Todo[]>> = {}

    // Initialize all days with empty hour groups
    days.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd')
      grouped[dateKey] = {}
      for (let i = 0; i < 24; i++) {
        grouped[dateKey][i] = []
      }
    })

    // Group todos by date and hour
    todos.forEach((todo) => {
      if (todo.deadline) {
        const deadlineDate = parseISO(todo.deadline)
        const dateKey = format(deadlineDate, 'yyyy-MM-dd')

        // Only include todos within the week
        if (grouped[dateKey]) {
          const hour = deadlineDate.getHours()
          grouped[dateKey][hour].push(todo)
        }
      }
    })

    return grouped
  }, [todos, days])

  return (
    <div data-testid="week-view" className={cn('flex flex-col h-full', className)}>
      {/* Header: Day names and dates (sticky) */}
      <div
        data-testid="week-header"
        className="flex border-b shrink-0 sticky top-0 bg-background z-10"
      >
        {/* TimeAxis spacer */}
        <div className="w-16 shrink-0" />

        {/* Day headers with horizontal scroll */}
        <div className="flex overflow-x-auto flex-1">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const isToday = isSameDay(day, today)

            return (
            <div
              key={dateKey}
              data-testid={`day-header-${dateKey}`}
              className={cn(
                'min-w-[140px] flex-1 text-center p-2 border-l',
                isToday && 'bg-blue-50'
              )}
            >
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className="text-xs text-muted-foreground">{format(day, 'd')}</div>
            </div>
          )
          })}
        </div>
      </div>

      {/* Grid: TimeAxis + Day columns with horizontal scroll */}
      <div className="flex flex-1 overflow-hidden">
        <TimeAxis className="shrink-0" />

        {/* Horizontal scroll container for day columns */}
        <div data-testid="week-grid" className="flex-1 overflow-x-auto">
          <div className="flex h-full">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const isToday = isSameDay(day, today)

              return (
                <div
                  key={dateKey}
                  data-testid={`day-column-${dateKey}`}
                  className={cn(
                    'min-w-[140px] border-l overflow-y-auto',
                    isToday && 'bg-blue-50/30'
                  )}
                >
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <HourSlot
                      key={hour}
                      date={day}
                      hour={hour}
                      todos={todosByDateHour[dateKey]?.[hour] || []}
                      onTodoClick={onTodoClick}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
import { useRef, useEffect, useMemo } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { TimeAxis } from './TimeAxis'
import { CurrentTimeIndicator } from './CurrentTimeIndicator'
import { HourSlot } from './HourSlot'
import type { Todo } from '@nanomail/shared'

export interface DayViewProps {
  date: Date
  todos: Todo[]
  onTodoClick?: (todo: Todo) => void
  className?: string
}

/**
 * DayView - 24-hour timeline view for a single day.
 *
 * Features:
 * - TimeAxis on the left with 24 hour labels
 * - 24 HourSlots for scheduling todos
 * - CurrentTimeIndicator showing current time position
 * - Auto-scrolls to current time - 2 hours on mount
 * - Filters todos by date (matching deadline)
 * - Groups todos by hour
 */
export function DayView({ date, todos, onTodoClick, className }: DayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter todos for this day and group by hour
  const todosByHour = useMemo(() => {
    const filtered = todos.filter((todo) => {
      if (!todo.deadline) return false
      const deadlineDate = parseISO(todo.deadline)
      return isSameDay(deadlineDate, date)
    })

    // Group by hour
    const grouped: Map<number, Todo[]> = new Map()
    for (let i = 0; i < 24; i++) {
      grouped.set(i, [])
    }

    filtered.forEach((todo) => {
      if (todo.deadline) {
        const deadlineDate = parseISO(todo.deadline)
        const hour = deadlineDate.getHours()
        const hourTodos = grouped.get(hour) ?? []
        hourTodos.push(todo)
        grouped.set(hour, hourTodos)
      }
    })

    return grouped
  }, [todos, date])

  // Auto-scroll to current time - 2 hours on mount
  useEffect(() => {
    if (!containerRef.current) return

    const now = new Date()
    const currentHour = now.getHours()
    const targetHour = Math.max(0, currentHour - 2)

    const targetSlot = containerRef.current.querySelector(
      `[data-testid="hour-slot-${targetHour}"]`
    )

    if (targetSlot) {
      targetSlot.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <div
      data-testid="day-view"
      className={cn('flex h-full overflow-auto', className)}
    >
      {/* Time axis on the left */}
      <TimeAxis className="sticky left-0 bg-gray-50 z-10" />

      {/* Main content area with hour slots */}
      <div className="flex-1 relative" ref={containerRef}>
        {/* Current time indicator */}
        <CurrentTimeIndicator containerRef={containerRef} />

        {/* Hour slots */}
        <div className="relative">
          {Array.from({ length: 24 }).map((_, hour) => (
            <HourSlot
              key={hour}
              date={date}
              hour={hour}
              todos={todosByHour.get(hour) ?? []}
              onTodoClick={onTodoClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
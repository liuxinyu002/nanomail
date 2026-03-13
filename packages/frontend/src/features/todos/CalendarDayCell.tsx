import { memo } from 'react'
import { format } from 'date-fns'
import type { Urgency } from '@nanomail/shared'
import { cn } from '@/lib/utils'

export interface CalendarDayCellProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  todoCount: number
  highestUrgency: Urgency | null
  onClick: (date: Date) => void
}

const urgencyColors: Record<Urgency, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

/**
 * CalendarDayCell - Single day cell in the calendar grid
 *
 * Renders a single day with:
 * - Day number
 * - Todo count badge (if any pending todos)
 * - Urgency color indicator (bottom bar)
 *
 * Uses React.memo for optimization to prevent unnecessary re-renders
 */
export const CalendarDayCell = memo(function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  todoCount,
  highestUrgency,
  onClick,
}: CalendarDayCellProps) {
  const dayNumber = format(date, 'd')

  const ariaLabel = todoCount > 0
    ? `${dayNumber}, ${todoCount} todo${todoCount > 1 ? 's' : ''}`
    : `${dayNumber}`

  return (
    <div
      data-testid="calendar-day-cell"
      role="button"
      aria-label={ariaLabel}
      onClick={() => onClick(date)}
      className={cn(
        'relative h-16 p-1 border cursor-pointer hover:bg-accent transition-colors',
        !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
        isToday && 'ring-2 ring-primary'
      )}
    >
      {/* Date number */}
      <span className="text-sm font-medium">{dayNumber}</span>

      {/* Todo count badge */}
      {todoCount > 0 && (
        <span
          data-testid="todo-count-badge"
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
        >
          {todoCount}
        </span>
      )}

      {/* Highest urgency color indicator */}
      {highestUrgency && (
        <div
          data-testid="urgency-indicator"
          className={cn(
            'absolute bottom-0 left-0 right-0 h-1',
            urgencyColors[highestUrgency]
          )}
        />
      )}
    </div>
  )
})
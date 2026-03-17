import { memo, useCallback, KeyboardEvent } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface CalendarDayCellProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  todoCount: number
  highestPriorityColumn: number | null
  onClick: (date: Date) => void
}

const columnColors: Record<number, string> = {
  2: 'bg-red-500',
  3: 'bg-amber-500',
  1: 'bg-blue-500',
  4: 'bg-green-500',
}

export const CalendarDayCell = memo(function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  todoCount,
  highestPriorityColumn,
  onClick,
}: CalendarDayCellProps) {
  const dayNumber = format(date, 'd')

  const ariaLabel = todoCount > 0
    ? `${dayNumber}, ${todoCount} todo${todoCount > 1 ? 's' : ''}`
    : `${dayNumber}`

  const handleClick = useCallback(() => {
    onClick(date)
  }, [onClick, date])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(date)
    }
  }, [onClick, date])

  return (
    <div
      data-testid="calendar-day-cell"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative h-16 p-1 border cursor-pointer hover:bg-accent transition-colors',
        !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
        isToday && 'ring-2 ring-primary'
      )}
    >
      <span className="text-sm font-medium">{dayNumber}</span>

      {todoCount > 0 && (
        <span
          data-testid="todo-count-badge"
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
        >
          {todoCount}
        </span>
      )}

      {highestPriorityColumn && (
        <div
          data-testid="priority-indicator"
          className={cn(
            'absolute bottom-0 left-0 right-0 h-1',
            columnColors[highestPriorityColumn] || 'bg-gray-500'
          )}
        />
      )}
    </div>
  )
})

import { memo, useCallback, KeyboardEvent } from 'react'
import { format } from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { COLUMN_ID_TO_TAILWIND } from '@/constants/colors'

export interface CalendarDayCellProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  todoCount: number
  highestPriorityColumn: number | null
  onClick: (date: Date) => void
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
  const dateStr = format(date, 'yyyy-MM-dd')

  // Make this cell a droppable zone for the planner
  const { setNodeRef, isOver } = useDroppable({
    id: `planner-${dateStr}`,
    data: {
      type: 'planner',
      date: dateStr,
    },
  })

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
      ref={setNodeRef}
      data-testid="calendar-day-cell"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative h-16 p-1 border cursor-pointer hover:bg-accent transition-colors',
        !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
        isToday && 'ring-2 ring-primary',
        isOver && 'bg-blue-100 ring-2 ring-blue-400' // Visual feedback when dragging over
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
            COLUMN_ID_TO_TAILWIND[highestPriorityColumn] || 'bg-gray-500'
          )}
        />
      )}
    </div>
  )
})

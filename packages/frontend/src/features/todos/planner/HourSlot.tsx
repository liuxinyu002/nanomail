import { useDroppable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { PlannerTodoCard } from './PlannerTodoCard'
import type { Todo } from '@nanomail/shared'

export interface HourSlotProps {
  date: Date
  hour: number
  todos: Todo[]
  onTodoClick?: (todo: Todo) => void
  className?: string
}

/**
 * HourSlot - Droppable hour slot for the planner scheduler.
 *
 * Each slot represents one hour (60px height) and can contain multiple todos.
 * Uses @dnd-kit/core's useDroppable for drag-and-drop support.
 */
export function HourSlot({ date, hour, todos, onTodoClick, className }: HourSlotProps) {
  // Use date-fns format() for timezone-safe date formatting
  const dateString = format(date, 'yyyy-MM-dd')
  const droppableId = `hour-${dateString}-${hour}`
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      type: 'planner' as const,
      date: dateString,
      hour,
    },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid={`hour-slot-${hour}`}
      className={cn(
        'h-[60px] relative border-b border-gray-200',
        'flex flex-col gap-0.5 px-1 py-0.5',
        isOver && 'bg-blue-50 ring-2 ring-blue-300 ring-inset',
        className
      )}
      role="listitem"
      aria-label={`${hour.toString().padStart(2, '0')}:00 slot`}
    >
      {todos.map((todo) => (
        <PlannerTodoCard
          key={todo.id}
          todo={todo}
          onClick={onTodoClick ? () => onTodoClick(todo) : undefined}
        />
      ))}
    </div>
  )
}
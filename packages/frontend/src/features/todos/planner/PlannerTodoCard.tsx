import { cn } from '@/lib/utils'
import { getColumnColorById } from '@/constants/colors'
import type { Todo } from '@nanomail/shared'

export interface PlannerTodoCardProps {
  todo: Todo
  onClick?: () => void
  className?: string
}

/**
 * PlannerTodoCard - Minimal todo card for the planner scheduler view.
 *
 * Design: Color bar (3-4px) on left + title only (no description).
 * Color is determined by boardColumnId.
 */
export function PlannerTodoCard({ todo, onClick, className }: PlannerTodoCardProps) {
  const colorInfo = getColumnColorById(todo.boardColumnId)
  const colorClass = colorInfo?.tailwind ?? 'bg-gray-500'

  return (
    <div
      data-testid={`planner-todo-card-${todo.id}`}
      className={cn(
        'flex items-center gap-1.5 px-1.5 py-1 rounded-sm',
        'bg-white border border-gray-100',
        'hover:bg-gray-50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Color bar - 4px width */}
      <div
        data-testid={`planner-todo-card-color-bar-${todo.id}`}
        className={cn('w-1 h-4 rounded-full shrink-0', colorClass)}
        aria-hidden="true"
      />
      {/* Title - truncated to single line */}
      <span className="text-xs text-gray-900 truncate flex-1">
        {todo.description}
      </span>
    </div>
  )
}
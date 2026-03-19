import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { TodoCard, TodoDetailPopover } from '../TodoCard'
import { useUpdateTodoMutation } from '@/hooks'
import type { Todo } from '@nanomail/shared'

/** Fallback color for todos without a color (gray-400) */
const FALLBACK_COLOR = '#9CA3AF'

export interface PlannerTodoCardProps {
  todo: Todo
  className?: string
}

/**
 * PlannerTodoCard - Minimal todo card for the planner scheduler view.
 *
 * Wraps TodoCard with compact mode and color bar.
 * Color is determined by todo.color field with fallback to gray.
 * Supports toggle completion status.
 * Clicking the card opens a popover with todo details.
 */
export function PlannerTodoCard({ todo, className }: PlannerTodoCardProps) {
  const updateMutation = useUpdateTodoMutation()
  const color = todo.color ?? FALLBACK_COLOR
  const isCompleted = todo.status === 'completed'

  const handleToggle = useCallback(() => {
    const newStatus = isCompleted ? 'pending' : 'completed'
    updateMutation.mutate({ id: todo.id, data: { status: newStatus } })
  }, [todo.id, isCompleted, updateMutation])

  return (
    <TodoDetailPopover todo={todo}>
      <div data-testid={`planner-todo-card-${todo.id}`}>
        <TodoCard
          todo={todo}
          onToggle={handleToggle}
          readonly
          compact
          colorBar={{ hexColor: color }}
          className={cn(
            'shadow-none border-gray-100',
            'hover:bg-gray-50',
            className
          )}
        />
      </div>
    </TodoDetailPopover>
  )
}

import { useMemo } from 'react'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { TodoCalendar } from './TodoCalendar'

export interface PlannerPanelProps {
  /** All todos (filtered by deadline in the calendar view) */
  todos: TodoItem[]
  /** Callback fired when a todo is clicked */
  onTodoClick?: (todo: TodoItem) => void
  /** Callback fired when a deadline is changed via drag */
  onDeadlineChange?: (todoId: number, deadline: string | null) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * PlannerPanel - Calendar-based view for todos with deadlines
 *
 * Features:
 * - Reuses TodoCalendar logic
 * - Shows all todos with deadlines regardless of boardColumnId
 * - Dropping a todo sets its deadline field (preserves boardColumnId)
 */
export function PlannerPanel({ todos, onTodoClick, className }: PlannerPanelProps) {
  // Count todos with deadlines (for display in header)
  const todosWithDeadlines = useMemo(() => {
    return todos.filter(t => t.deadline !== null)
  }, [todos])

  return (
    <div
      data-testid="planner-panel"
      className={cn('flex flex-col bg-background rounded-lg border', className)}
    >
      {/* Header */}
      <div
        data-testid="panel-header"
        className="p-4 border-b flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold">Planner</h2>
        <span
          className="text-sm text-muted-foreground"
          aria-label={`${todosWithDeadlines.length} scheduled tasks`}
        >
          {todosWithDeadlines.length} scheduled
        </span>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <TodoCalendar onTodoClick={onTodoClick} />
      </div>
    </div>
  )
}
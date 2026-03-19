import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { DayView, WeekView, PlannerViewToggle } from './planner'
import type { Todo } from '@nanomail/shared'

export interface PlannerPanelProps {
  /** All todos (filtered by deadline in the panel) */
  todos: Todo[]
  /** Callback fired when a todo is clicked */
  onTodoClick?: (todo: Todo) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * PlannerPanel - Calendar-based view for todos with deadlines.
 *
 * Features:
 * - Shows all todos with deadline set
 * - Day view (default) and Week view toggle
 * - Current date passed to DayView
 * - Selected date passed to WeekView (smart default applies within)
 */
export function PlannerPanel({ todos, onTodoClick, className }: PlannerPanelProps): JSX.Element {
  // View state: 'day' or 'week'
  const [view, setView] = useState<'day' | 'week'>('day')

  // Current date for DayView
  const [currentDate] = useState(() => new Date())

  // Filter todos: only show items with deadline
  const scheduledTodos = useMemo(() => {
    return todos.filter(t => t.deadline !== null)
  }, [todos])

  return (
    <div
      data-testid="planner-panel"
      className={cn('flex flex-col h-full bg-background rounded-lg border', className)}
    >
      {/* Header */}
      <div
        data-testid="panel-header"
        className="p-4 border-b flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <PlannerViewToggle value={view} onChange={setView} />
        </div>
        <span
          className="text-sm text-muted-foreground"
          aria-label={`${scheduledTodos.length} scheduled tasks`}
        >
          {scheduledTodos.length} scheduled
        </span>
      </div>

      {/* Calendar View */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'day' ? (
          <DayView
            date={currentDate}
            todos={scheduledTodos}
            onTodoClick={onTodoClick}
          />
        ) : (
          <WeekView
            selectedDate={currentDate}
            todos={scheduledTodos}
            onTodoClick={onTodoClick}
          />
        )}
      </div>
    </div>
  )
}
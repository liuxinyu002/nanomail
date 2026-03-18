import { useState, useMemo } from 'react'
import { startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { DayView, WeekView, PlannerViewToggle } from './planner'
import type { Todo } from '@nanomail/shared'

export interface PlannerPanelProps {
  /** All todos (filtered by deadline and boardColumnId in the panel) */
  todos: Todo[]
  /** Callback fired when a todo is clicked */
  onTodoClick?: (todo: Todo) => void
  /** Callback fired when a deadline is changed via drag */
  onDeadlineChange?: (todoId: number, deadline: string | null) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * PlannerPanel - Calendar-based view for todos with deadlines.
 *
 * Features:
 * - Shows only todos with deadline AND boardColumnId === 2
 * - Day view (default) and Week view toggle
 * - Current date passed to DayView
 * - Week start (Sunday) passed to WeekView
 */
export function PlannerPanel({ todos, onTodoClick, className }: PlannerPanelProps) {
  // View state: 'day' or 'week'
  const [view, setView] = useState<'day' | 'week'>('day')

  // Current date for DayView
  const [currentDate] = useState(() => new Date())

  // Filter todos: only show items with deadline AND boardColumnId === 2
  const scheduledTodos = useMemo(() => {
    return todos.filter(t => t.deadline !== null && t.boardColumnId === 2)
  }, [todos])

  // Calculate week start (Sunday)
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate])

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
      <div className="flex-1 overflow-hidden">
        {view === 'day' ? (
          <DayView
            date={currentDate}
            todos={scheduledTodos}
            onTodoClick={onTodoClick}
          />
        ) : (
          <WeekView
            weekStart={weekStart}
            todos={scheduledTodos}
            onTodoClick={onTodoClick}
          />
        )}
      </div>
    </div>
  )
}
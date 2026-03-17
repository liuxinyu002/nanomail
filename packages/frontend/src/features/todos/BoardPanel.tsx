import { useMemo } from 'react'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { BoardColumnDroppable } from './BoardColumnDroppable'

export interface BoardPanelProps {
  /** All board columns */
  columns: BoardColumn[]
  /** All todos (will be filtered by column) */
  todos: TodoItem[]
  /** Callback fired when a todo is moved between columns */
  onColumnChange?: (todoId: number, columnId: number, position?: number) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * BoardPanel - Kanban-style board for managing todos
 *
 * Critical: This component displays ONLY columns 2-4, EXCLUDING the Inbox (column 1).
 * This ensures data is mutually exclusive with InboxPanel which displays column 1.
 *
 * Features:
 * - Displays columns 2-4 (Todo, In Progress, Done)
 * - Each column is a sortable droppable zone
 * - Updates boardColumnId and position on drop
 */
export function BoardPanel({ columns, todos, className }: BoardPanelProps) {
  // Filter out Inbox column (id === 1) - Critical for mutual exclusivity
  const displayColumns = useMemo(() => {
    return columns
      .filter(c => c.id !== 1)
      .sort((a, b) => a.order - b.order)
  }, [columns])

  // Get todos for a specific column
  const getColumnTodos = useMemo(() => {
    return (columnId: number): TodoItem[] => {
      return todos.filter(t => t.boardColumnId === columnId)
    }
  }, [todos])

  const isEmpty = displayColumns.length === 0

  return (
    <div
      data-testid="board-panel"
      className={cn('flex flex-col bg-background rounded-lg border', className)}
    >
      {/* Header */}
      <div
        data-testid="panel-header"
        className="p-4 border-b flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold">Board</h2>
        <span
          className="text-sm text-muted-foreground"
          aria-label={`${displayColumns.length} columns`}
        >
          {displayColumns.length} columns
        </span>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-auto p-4">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No columns configured</p>
          </div>
        ) : (
          <div
            data-testid="columns-container"
            className="flex gap-4 h-full"
          >
            {displayColumns.map(column => (
              <BoardColumnDroppable
                key={column.id}
                column={column}
                todos={getColumnTodos(column.id)}
                className="flex-1 min-w-[250px] max-w-[350px]"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
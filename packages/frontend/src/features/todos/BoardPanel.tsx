import { useMemo, useCallback } from 'react'
import { BoardColumnIds, type BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { BoardColumnDroppable } from './BoardColumnDroppable'
import { NewListButton } from './NewListButton'

export interface BoardPanelProps {
  /** All board columns */
  columns: BoardColumn[]
  /** All todos (will be filtered by column) */
  todos: TodoItem[]
  /** Callback fired when a new column is created */
  onCreateColumn?: (name: string, order: number) => void
  /** Callback fired when a column is deleted */
  onDeleteColumn?: (columnId: number) => void
  /** Callback fired when a column is updated (name, color, etc.) */
  onUpdateColumn?: (columnId: number, data: { name?: string; color?: string | null }) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * BoardPanel - Kanban-style board for managing todos
 *
 * Critical: This component displays ONLY columns 2-4, EXCLUDING the Inbox.
 * This ensures data is mutually exclusive with InboxPanel which displays Inbox column.
 *
 * Features:
 * - Displays non-Inbox columns (Todo, In Progress, Done, and custom columns)
 * - Each column is a sortable droppable zone
 * - Updates boardColumnId and position on drop
 * - New List button for creating new columns
 */
export function BoardPanel({ columns, todos, onCreateColumn, onDeleteColumn, onUpdateColumn, className }: BoardPanelProps) {
  // Filter out Inbox column - Critical for mutual exclusivity
  const displayColumns = useMemo(() => {
    return columns
      .filter(c => c.id !== BoardColumnIds.INBOX)
      .sort((a, b) => a.order - b.order)
  }, [columns])

  // Get todos for a specific column
  const getColumnTodos = useMemo(() => {
    return (columnId: number): TodoItem[] => {
      return todos.filter(t => t.boardColumnId === columnId)
    }
  }, [todos])

  // Calculate the next order for a new column
  const getNextOrder = useCallback(() => {
    if (displayColumns.length === 0) return 0
    const maxOrder = displayColumns.reduce((max, col) => Math.max(max, col.order), 0)
    return maxOrder + 1
  }, [displayColumns])

  // Handle creating a new column
  const handleCreateColumn = useCallback((name: string) => {
    const nextOrder = getNextOrder()
    onCreateColumn?.(name, nextOrder)
  }, [getNextOrder, onCreateColumn])

  // Handle deleting a column
  const handleDeleteColumn = useCallback((columnId: number) => {
    onDeleteColumn?.(columnId)
  }, [onDeleteColumn])

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
          <div className="flex gap-4 h-full">
            {/* Show only the New List button when no columns exist */}
            <NewListButton onCreateColumn={handleCreateColumn} />
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
                onRename={(name) => onUpdateColumn?.(column.id, { name })}
                onColorChange={(color) => onUpdateColumn?.(column.id, { color })}
                onDelete={() => handleDeleteColumn(column.id)}
              />
            ))}
            {/* New List button as "virtual column" at the end */}
            <NewListButton onCreateColumn={handleCreateColumn} />
          </div>
        )}
      </div>
    </div>
  )
}
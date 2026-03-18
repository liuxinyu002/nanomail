import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { DraggableTodoItem } from './DraggableTodoItem'
import { ColumnHeader } from './ColumnHeader'
import { EmptyState } from './EmptyState'

export interface BoardColumnDroppableProps {
  /** The column to display */
  column: BoardColumn
  /** Todos belonging to this column */
  todos: TodoItem[]
  /** Additional CSS classes */
  className?: string
  /** Callback when column is renamed */
  onRename?: (name: string) => void
  /** Callback when column color changes */
  onColorChange?: (color: string | null) => void
  /** Callback when column is deleted */
  onDelete?: () => void
}

/**
 * BoardColumnDroppable - A sortable droppable container for a Kanban board column
 *
 * Features:
 * - Header with column name, color indicator, count, and settings menu
 * - Inline renaming via double-click
 * - Sortable container using SortableContext
 * - Visual feedback on drag-over
 * - Fixed neutral background (#F7F8FA) for clean appearance
 */
export function BoardColumnDroppable({
  column,
  todos,
  className,
  onRename,
  onColorChange,
  onDelete,
}: BoardColumnDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'board',
      columnId: column.id,
    },
  })

  const todoIds = todos.map(t => t.id)
  const isEmpty = todos.length === 0
  const showEmptyState = isEmpty && !isOver
  const showDropIndicator = isOver && isEmpty

  return (
    <div
      data-testid="board-column-droppable"
      className={cn(
        'flex flex-col rounded-lg p-3',
        'border border-gray-200',
        className
      )}
      style={{ backgroundColor: '#F7F8FA' }}
    >
      {/* Column Header */}
      <ColumnHeader
        column={column}
        itemCount={todos.length}
        onRename={onRename || (() => {})}
        onColorChange={onColorChange || (() => {})}
        onDelete={onDelete || (() => {})}
      />

      {/* Droppable Zone */}
      <div
        ref={setNodeRef}
        data-testid="droppable-zone"
        className={cn(
          'flex-1 min-h-[200px]',
          'transition-colors duration-200',
          isOver && 'bg-blue-50'
        )}
      >
        {/* Empty State OR Cards */}
        {showEmptyState ? (
          <EmptyState
            message={`No tasks in ${column.name}`}
            className="min-h-[160px]"
          />
        ) : (
          <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {todos.map(todo => (
                <DraggableTodoItem key={todo.id} todo={todo} />
              ))}
            </div>
          </SortableContext>
        )}

        {/* Drop Indicator when dragging over empty column */}
        {showDropIndicator && (
          <div
            data-testid="drop-indicator"
            className="border-2 border-dashed border-blue-500 rounded-md p-4 mt-2"
          >
            <p className="text-blue-500 text-sm text-center">
              Drop here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
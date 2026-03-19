import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { DraggableTodoItem } from './DraggableTodoItem'
import { ColumnHeader } from './ColumnHeader'
import { EmptyState } from './EmptyState'

const FALLBACK_BG_COLOR = '#F7F8FA'

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
 * - Card area with 12% opacity color overlay from column color
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

  // Determine column color for overlay
  const columnColor = column.color ?? FALLBACK_BG_COLOR

  return (
    <div
      data-testid="board-column-droppable"
      className={cn(
        'flex flex-col rounded-lg overflow-hidden',
        'border border-gray-200',
        className
      )}
    >
      {/* Column Header - handles its own colored background */}
      <ColumnHeader
        column={column}
        itemCount={todos.length}
        onRename={onRename || (() => {})}
        onColorChange={onColorChange || (() => {})}
        onDelete={onDelete || (() => {})}
      />

      {/* Card Area - with color overlay */}
      <div
        data-testid="card-area"
        className={cn(
          'flex-1 min-h-[200px] relative',
          'transition-colors duration-200'
        )}
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Color overlay layer - 12% opacity */}
        <div
          data-testid="color-overlay"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: columnColor,
            opacity: 0.12
          }}
        />

        {/* Content layer */}
        <div
          ref={setNodeRef}
          data-testid="droppable-zone"
          className={cn(
            'relative z-10 p-3',
            isOver && 'ring-2 ring-blue-400 ring-inset'
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
    </div>
  )
}
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { DraggableTodoItem } from './DraggableTodoItem'
import { ColumnHeader } from './ColumnHeader'

const VALID_HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

function isValidHexColor(color: string | null | undefined): boolean {
  if (!color) return false
  return VALID_HEX_COLOR_REGEX.test(color)
}

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

  // Check if column has a valid hex color
  const hasValidColor = isValidHexColor(column.color)

  return (
    <div
      data-testid="board-column-droppable"
      className={cn(
        'flex flex-col rounded-lg',
        'border border-gray-200',
        !hasValidColor && 'bg-gray-50',
        className
      )}
      style={hasValidColor ? { backgroundColor: column.color! } : undefined}
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
          'flex-1 p-2 min-h-[200px]',
          'transition-colors duration-200',
          isOver && 'bg-blue-50'
        )}
      >
        <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {todos.map(todo => (
              <DraggableTodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
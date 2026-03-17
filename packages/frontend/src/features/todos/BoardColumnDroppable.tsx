import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { DraggableTodoItem } from './DraggableTodoItem'

export interface BoardColumnDroppableProps {
  /** The column to display */
  column: BoardColumn
  /** Todos belonging to this column */
  todos: TodoItem[]
  /** Additional CSS classes */
  className?: string
}

const VALID_HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

function isValidHexColor(color: string | null | undefined): boolean {
  if (!color) return false
  return VALID_HEX_COLOR_REGEX.test(color)
}

function getSafeColor(color: string | null | undefined): string | undefined {
  if (!isValidHexColor(color)) return undefined
  return color ?? undefined
}

/**
 * BoardColumnDroppable - A sortable droppable container for a Kanban board column
 *
 * Features:
 * - Header with column name and count
 * - Sortable container using SortableContext
 * - Visual feedback on drag-over
 */
export function BoardColumnDroppable({ column, todos, className }: BoardColumnDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'board',
      columnId: column.id,
    },
  })

  const todoIds = todos.map(t => t.id)
  const safeColor = getSafeColor(column.color)

  return (
    <div
      data-testid="board-column-droppable"
      className={cn(
        'flex flex-col bg-gray-50 rounded-lg',
        'border border-gray-200',
        className
      )}
    >
      {/* Column Header */}
      <div
        data-testid="column-header"
        className="p-3 border-b flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {safeColor && (
            <div
              data-testid="column-color-indicator"
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: safeColor }}
            />
          )}
          <h3 className="font-medium text-sm">{column.name}</h3>
        </div>
        <span
          className="text-sm text-gray-500"
          aria-label={`${todos.length} items`}
        >
          {todos.length}
        </span>
      </div>

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

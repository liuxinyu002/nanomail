import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardColumn } from '@nanomail/shared'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { useDndContext } from '@/contexts/DndContext'
import { DraggableTodoItem } from './DraggableTodoItem'
import { ColumnHeader } from './ColumnHeader'
import { EmptyState } from './EmptyState'

const FALLBACK_BG_COLOR = '#F7F8FA'

/**
 * Calculates the display index for a todo item during drag operations.
 * This enables real-time badge number updates to preview the new order.
 *
 * @param todoId - The ID of the todo item to calculate index for
 * @param originalIndex - The original index of the todo item
 * @param todos - Array of todos in the current column
 * @param activeId - The ID of the item being dragged (null if not dragging)
 * @param overId - The ID of the item being hovered over (null if not over anything)
 * @returns The display index to show in the badge
 */
export function getDisplayIndex(
  todoId: number,
  originalIndex: number,
  todos: { id: number }[],
  activeId: number | null,
  overId: number | null
): number {
  // Not dragging - return original index
  if (activeId === null || overId === null) {
    return originalIndex
  }

  // Find indices of active and over items
  const activeIndex = todos.findIndex(t => t.id === activeId)
  const overIndex = todos.findIndex(t => t.id === overId)

  // Handle cross-column drag scenarios
  // If active item or over item not found in current column, return original index
  if (activeIndex === -1 || overIndex === -1) {
    return originalIndex
  }

  // The active (dragged) item shows at the over position
  if (todoId === activeId) {
    return overIndex
  }

  // Calculate display index for other items based on drag direction
  if (activeIndex < overIndex) {
    // Dragging down: items between activeIndex and overIndex shift up
    if (originalIndex > activeIndex && originalIndex <= overIndex) {
      return originalIndex - 1
    }
  } else if (activeIndex > overIndex) {
    // Dragging up: items between overIndex and activeIndex shift down
    if (originalIndex >= overIndex && originalIndex < activeIndex) {
      return originalIndex + 1
    }
  }

  // Item is outside the affected range - no change
  return originalIndex
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

  // Get drag state from DndContext for real-time badge updates
  const { activeItem, overZone } = useDndContext()

  const todoIds = todos.map(t => t.id)
  const isEmpty = todos.length === 0
  const showEmptyState = isEmpty && !isOver
  const showDropIndicator = isOver && isEmpty

  // Determine column color for overlay
  const columnColor = column.color ?? FALLBACK_BG_COLOR

  // Extract active and over IDs for display index calculation
  // activeItem.id is the todo being dragged
  // overZone.id could be a todo id (sortable) or column id (droppable)
  const activeId = activeItem?.id != null ? Number(activeItem.id) : null
  const overId = overZone?.id != null ? Number(overZone.id) : null

  return (
    <div
      data-testid="board-column-droppable"
      className={cn(
        'flex flex-col h-full rounded-lg overflow-hidden',
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

      {/* Card Area - with color overlay, this is the droppable zone */}
      <div
        ref={setNodeRef}
        data-testid="card-area"
        className={cn(
          'flex-1 min-h-0 flex flex-col relative overflow-auto',
          'transition-colors duration-200',
          isOver && 'ring-2 ring-blue-400 ring-inset'
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

        {/* Content layer - no flex-1 to allow height determined by content */}
        <div
          data-testid="droppable-zone"
          className="relative z-10 p-3"
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
                {todos.map((todo, index) => {
                  // Calculate display index for real-time badge updates during drag
                  const displayIndex = getDisplayIndex(todo.id, index, todos, activeId, overId)
                  return (
                    <DraggableTodoItem key={todo.id} todo={todo} index={displayIndex} />
                  )
                })}
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
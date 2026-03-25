import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TodoItem } from './TodoItem'
import type { TodoItem as TodoItemType } from '@/services'
import { cn } from '@/lib/utils'

export interface DraggableTodoItemProps {
  todo: TodoItemType
  /** Index in the list (for ordinal display) */
  index?: number
  showDelete?: boolean
  /** Whether to show highlight animation (for restored todos) */
  isHighlighted?: boolean
}

/**
 * A sortable wrapper for TodoItem component.
 * Provides drag-and-drop functionality with visual feedback.
 *
 * Phase 2: Passes ordinal and dragHandleProps to TodoItem,
 * allowing the drag handle to be rendered inside TodoCardHeader
 * with hover-swap interaction pattern.
 *
 * Phase 3: Uses useSortable for proper drop indicator/displacement
 * animations during sortable drag operations.
 */
export function DraggableTodoItem({ todo, index, showDelete, isHighlighted }: DraggableTodoItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: todo.id,
    data: {
      type: 'todo',
      todo,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="draggable-todo-item"
      className={cn(
        'relative transition-opacity',
        isDragging && 'opacity-50'
      )}
    >
      <TodoItem
        todo={todo}
        showDelete={showDelete}
        ordinal={index !== undefined ? index + 1 : undefined}
        dragHandleProps={{ ...attributes, ...listeners }}
        isHighlighted={isHighlighted}
      />
    </div>
  )
}
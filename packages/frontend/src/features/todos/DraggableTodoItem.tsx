import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { TodoItem } from './TodoItem'
import type { TodoItem as TodoItemType } from '@/services'
import { cn } from '@/lib/utils'

export interface DraggableTodoItemProps {
  todo: TodoItemType
}

/**
 * A draggable wrapper for TodoItem component.
 * Provides drag-and-drop functionality with visual feedback.
 *
 * Design: Drag handle is absolutely positioned inside the container's left edge,
 * appearing on hover without occupying flex space, maximizing content area.
 */
export function DraggableTodoItem({ todo }: DraggableTodoItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
    data: {
      type: 'todo',
      todo,
    },
  })

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="draggable-todo-item"
      className={cn(
        'group relative transition-opacity',
        isDragging && 'opacity-50'
      )}
    >
      {/* Drag Handle - Absolutely positioned inside left edge, no space occupation */}
      <button
        data-testid="drag-handle"
        type="button"
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 z-10',
          'cursor-grab active:cursor-grabbing',
          'text-muted-foreground hover:text-foreground',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'touch-none'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Todo Item - Full width */}
      <TodoItem todo={todo} />
    </div>
  )
}
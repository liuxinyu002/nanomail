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
        'group flex items-center gap-2 transition-opacity',
        isDragging && 'opacity-50'
      )}
    >
      {/* Drag Handle - ONLY this area triggers drag */}
      <button
        data-testid="drag-handle"
        type="button"
        className={cn(
          'cursor-grab active:cursor-grabbing p-1',
          'text-muted-foreground hover:text-foreground',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'touch-none'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Todo Item */}
      <div className="flex-1">
        <TodoItem todo={todo} />
      </div>
    </div>
  )
}
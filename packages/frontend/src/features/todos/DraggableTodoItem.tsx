import { useEffect } from 'react'
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

  // Debug logging for draggable state changes
  useEffect(() => {
    if (isDragging) {
      console.log('[DnD Debug] DraggableTodoItem - Started dragging:', {
        todoId: todo.id,
        todoDescription: todo.description,
        boardColumnId: todo.boardColumnId,
      })
    }
  }, [isDragging, todo.id, todo.description, todo.boardColumnId])

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid="draggable-todo-item"
      className={cn(
        'flex items-center gap-2 transition-opacity',
        isDragging && 'opacity-50'
      )}
      {...attributes}
    >
      {/* Drag Handle */}
      <div
        data-testid="drag-handle"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Todo Item */}
      <div className="flex-1">
        <TodoItem todo={todo} />
      </div>
    </div>
  )
}
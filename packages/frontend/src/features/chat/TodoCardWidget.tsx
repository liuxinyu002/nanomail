import { useState } from 'react'
import { CheckSquare, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { todoService } from '@/services/todo.service'
import type { Todo, TodoStatus } from '@nanomail/shared'

interface TodoCardWidgetProps {
  todos: Todo[]
  onUpdate?: () => void
  onEdit?: (todoId: string) => void
  onDelete?: (todoId: string) => void
  readonly?: boolean
}

export function TodoCardWidget({ todos, onUpdate, onEdit, onDelete, readonly = false }: TodoCardWidgetProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleToggle = async (todoId: string, currentStatus: TodoStatus) => {
    if (readonly) return

    const newStatus: TodoStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    setUpdatingId(todoId)
    try {
      await todoService.update(todoId, { status: newStatus })
      onUpdate?.()
    } catch (error) {
      console.error('Failed to update todo:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <CheckSquare className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Todos</span>
      </div>
      <ul className="flex flex-col gap-2 p-3">
        {todos.map(todo => (
          <li key={todo.id} className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
            {!readonly && (
              <input
                type="checkbox"
                checked={todo.status === 'completed'}
                onChange={() => handleToggle(String(todo.id), todo.status)}
                disabled={updatingId === String(todo.id)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            )}
            <span className={cn(
              'flex-1 text-sm',
              todo.status === 'completed' && 'line-through text-gray-400'
            )}>
              {todo.description}
            </span>
            {todo.deadline && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                {formatDeadline(todo.deadline)}
              </span>
            )}
            {!readonly && (onEdit || onDelete) && (
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(String(todo.id))}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Edit todo"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(String(todo.id))}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete todo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

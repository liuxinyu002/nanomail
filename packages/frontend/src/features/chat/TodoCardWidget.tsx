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
}

export function TodoCardWidget({ todos, onUpdate, onEdit, onDelete }: TodoCardWidgetProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleToggle = async (todoId: string, currentStatus: TodoStatus) => {
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
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Todos</span>
      </div>
      <ul className="p-3 flex flex-col gap-2">
        {todos.map(todo => (
          <li key={todo.id} className="group bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 flex items-center gap-3 transition-shadow hover:shadow-md">
            <input
              type="checkbox"
              checked={todo.status === 'completed'}
              onChange={() => handleToggle(String(todo.id), todo.status)}
              disabled={updatingId === String(todo.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={cn(
              "flex-1 text-sm",
              todo.status === 'completed' && "line-through text-gray-400"
            )}>
              {todo.description}
            </span>
            {todo.deadline && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                {formatDeadline(todo.deadline)}
              </span>
            )}
            {/* Quick actions - hover fade in */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(String(todo.id))}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  aria-label="Edit todo"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(String(todo.id))}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  aria-label="Delete todo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

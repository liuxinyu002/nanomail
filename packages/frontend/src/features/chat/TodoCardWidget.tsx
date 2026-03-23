import { useState } from 'react'
import { CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { todoService } from '@/services/todo.service'
import type { Todo, TodoStatus } from '@nanomail/shared'

interface TodoCardWidgetProps {
  todos: Todo[]
  onUpdate?: () => void
}

export function TodoCardWidget({ todos, onUpdate }: TodoCardWidgetProps) {
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
      <ul className="divide-y divide-gray-100">
        {todos.map(todo => (
          <li key={todo.id} className="px-3 py-2 flex items-center gap-3 hover:bg-gray-50">
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
              <span className="text-xs text-gray-500">
                {formatDeadline(todo.deadline)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

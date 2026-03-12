import { useState, useEffect, useMemo, useCallback } from 'react'
import { CheckSquare, Loader2 } from 'lucide-react'
import { TodoService, type TodoItem } from '@/services'
import { TodoColumn } from '@/features/todos/TodoColumn'
import { toast } from 'sonner'

const COMPLETED_DISPLAY_LIMIT = 10

export function TodosPage() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [completedLimit, setCompletedLimit] = useState(COMPLETED_DISPLAY_LIMIT)

  // Fetch todos on mount
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const response = await TodoService.getTodos()
        setTodos(response.todos)
      } catch (error) {
        console.error('Failed to fetch todos:', error)
        toast.error('Failed to load todos')
      } finally {
        setLoading(false)
      }
    }

    fetchTodos()
  }, [])

  // Group todos by urgency and status
  const { highPriority, mediumPriority, lowPriority, completed } = useMemo(() => {
    const pending = todos.filter((t) => t.status !== 'completed')
    const completedTodos = todos.filter((t) => t.status === 'completed')

    return {
      highPriority: pending.filter((t) => t.urgency === 'high'),
      mediumPriority: pending.filter((t) => t.urgency === 'medium'),
      lowPriority: pending.filter((t) => t.urgency === 'low'),
      completed: completedTodos,
    }
  }, [todos])

  // Handle status change from TodoItem
  const handleStatusChange = useCallback((updatedTodo: TodoItem) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t))
    )
  }, [])

  // Load more completed items
  const handleLoadMoreCompleted = useCallback(() => {
    setCompletedLimit((prev) => prev + COMPLETED_DISPLAY_LIMIT)
  }, [])

  const displayCompleted = completed.slice(0, completedLimit)
  const hasMoreCompleted = completed.length > completedLimit

  // Show empty state
  const isEmpty = todos.length === 0

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">To-Do</h1>
        <div
          className="flex items-center justify-center py-12"
          data-testid="loading-todos"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">To-Do</h1>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Action Items</h2>
          <p className="text-muted-foreground max-w-md">
            Action items extracted from your emails will be displayed here.
            Process some emails to see your to-dos.
          </p>
        </div>
      ) : (
        <div
          data-testid="todos-grid"
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <TodoColumn
            title="High Priority"
            todos={highPriority}
            emptyMessage="No high priority tasks"
            variant="high"
            onStatusChange={handleStatusChange}
          />
          <TodoColumn
            title="Medium Priority"
            todos={mediumPriority}
            emptyMessage="No medium priority tasks"
            variant="medium"
            onStatusChange={handleStatusChange}
          />
          <TodoColumn
            title="Low Priority"
            todos={lowPriority}
            emptyMessage="No low priority tasks"
            variant="low"
            onStatusChange={handleStatusChange}
          />
          <TodoColumn
            title="Completed"
            todos={displayCompleted}
            emptyMessage="No completed tasks"
            variant="completed"
            onStatusChange={handleStatusChange}
            showLoadMore={hasMoreCompleted}
            onLoadMore={handleLoadMoreCompleted}
          />
        </div>
      )}
    </div>
  )
}
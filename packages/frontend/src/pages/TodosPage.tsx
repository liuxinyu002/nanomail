import { useState, useMemo, useCallback } from 'react'
import { CheckSquare, Loader2, List, Calendar } from 'lucide-react'
import { TodoColumn } from '@/features/todos/TodoColumn'
import { TodoCalendar } from '@/features/todos/TodoCalendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTodos } from '@/hooks'
import { toast } from 'sonner'

type ViewMode = 'list' | 'calendar'

const COMPLETED_DISPLAY_LIMIT = 10

export function TodosPage() {
  const [completedLimit, setCompletedLimit] = useState(COMPLETED_DISPLAY_LIMIT)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Use React Query hook for fetching todos
  const { data, isLoading, error } = useTodos()
  const todos = data?.todos ?? []

  // Show error toast if query fails
  if (error) {
    toast.error('Failed to load todos')
  }

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

  // Load more completed items
  const handleLoadMoreCompleted = useCallback(() => {
    setCompletedLimit((prev) => prev + COMPLETED_DISPLAY_LIMIT)
  }, [])

  const displayCompleted = completed.slice(0, completedLimit)
  const hasMoreCompleted = completed.length > completedLimit

  // Show empty state
  const isEmpty = todos.length === 0

  if (isLoading) {
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

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
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
              />
              <TodoColumn
                title="Medium Priority"
                todos={mediumPriority}
                emptyMessage="No medium priority tasks"
                variant="medium"
              />
              <TodoColumn
                title="Low Priority"
                todos={lowPriority}
                emptyMessage="No low priority tasks"
                variant="low"
              />
              <TodoColumn
                title="Completed"
                todos={displayCompleted}
                emptyMessage="No completed tasks"
                variant="completed"
                showLoadMore={hasMoreCompleted}
                onLoadMore={handleLoadMoreCompleted}
                showDelete={true}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <TodoCalendar />
        </TabsContent>
      </Tabs>
    </div>
  )
}

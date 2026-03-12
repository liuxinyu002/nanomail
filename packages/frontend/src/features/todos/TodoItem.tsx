import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TodoService, type TodoItem as TodoItemType } from '@/services'
import { cn } from '@/lib/utils'
import { AssistReplySheet } from './AssistReplySheet'

export interface TodoItemProps {
  todo: TodoItemType
  onStatusChange?: (updatedTodo: TodoItemType) => void
}

const urgencyBorderColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-500',
}

export function TodoItem({ todo, onStatusChange }: TodoItemProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<TodoItemType['status'] | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAssistSheetOpen, setIsAssistSheetOpen] = useState(false)

  const currentStatus = optimisticStatus ?? todo.status
  const isCompleted = currentStatus === 'completed'

  const handleToggle = useCallback(async () => {
    const newStatus = isCompleted ? 'pending' : 'completed'

    // Optimistic update
    setOptimisticStatus(newStatus)
    setIsUpdating(true)

    try {
      const updated = await TodoService.updateTodoStatus(todo.id, newStatus)
      setOptimisticStatus(null)
      onStatusChange?.(updated)
    } catch (error) {
      // Rollback on error
      console.error('Failed to update todo status:', error)
      setOptimisticStatus(null)
      toast.error('Failed to update todo status')
    } finally {
      setIsUpdating(false)
    }
  }, [todo.id, isCompleted, onStatusChange])

  return (
    <div
      data-testid="todo-item-container"
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border-l-4 bg-background/50 hover:bg-background/80 transition-colors',
        urgencyBorderColors[todo.urgency]
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        disabled={isUpdating}
        aria-label={todo.description}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {todo.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={todo.urgency} className="text-xs">
            {todo.urgency}
          </Badge>
          <Link
            to={`/inbox?email=${todo.emailId}`}
            className="text-xs text-muted-foreground hover:text-primary underline"
            data-testid="email-link"
          >
            View email
          </Link>
          {!isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => setIsAssistSheetOpen(true)}
              aria-label={`Assist reply for: ${todo.description}`}
            >
              Assist Reply
            </Button>
          )}
        </div>
      </div>

      <AssistReplySheet
        open={isAssistSheetOpen}
        onOpenChange={setIsAssistSheetOpen}
        todo={todo}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}
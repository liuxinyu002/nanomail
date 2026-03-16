import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TodoItem as TodoItemType } from '@/services'
import { cn } from '@/lib/utils'
import { AssistReplySheet } from './AssistReplySheet'
import { DeadlineDisplay } from '@/components/DeadlineDisplay'
import { useUpdateTodoMutation, useDeleteTodoMutation } from '@/hooks'

export interface TodoItemProps {
  todo: TodoItemType
  showDelete?: boolean
}

const urgencyBorderColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-500',
}

export function TodoItem({ todo, showDelete = false }: TodoItemProps) {
  const [isAssistSheetOpen, setIsAssistSheetOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateMutation = useUpdateTodoMutation()
  const deleteMutation = useDeleteTodoMutation()

  const isCompleted = todo.status === 'completed'

  const handleToggle = useCallback(() => {
    const newStatus = isCompleted ? 'pending' : 'completed'
    updateMutation.mutate({ id: todo.id, data: { status: newStatus } })
  }, [todo.id, isCompleted, updateMutation])

  const handleDeleteClick = useCallback(() => {
    if (confirmDelete) {
      deleteMutation.mutate(todo.id)
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }, [confirmDelete, deleteMutation, todo.id])

  return (
    <div
      data-testid="todo-item-container"
      onMouseLeave={() => setConfirmDelete(false)}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border-l-4 bg-background/50 hover:bg-background/80 transition-colors',
        urgencyBorderColors[todo.urgency]
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleToggle}
        disabled={updateMutation.isPending}
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
          <DeadlineDisplay deadline={todo.deadline} />
          <Link
            to={`/inbox/${todo.emailId}`}
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

      {showDelete && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'shrink-0 h-8 min-w-[60px] justify-center',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            confirmDelete
              ? 'text-destructive hover:text-destructive'
              : 'text-muted-foreground hover:text-destructive'
          )}
          onClick={handleDeleteClick}
          disabled={deleteMutation.isPending}
          aria-label={confirmDelete ? 'Confirm delete' : 'Delete todo'}
        >
          {deleteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : confirmDelete ? (
            '确认?'
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      )}

      <AssistReplySheet
        open={isAssistSheetOpen}
        onOpenChange={setIsAssistSheetOpen}
        todo={todo}
      />
    </div>
  )
}
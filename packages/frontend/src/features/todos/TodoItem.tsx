import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui'
import { Button } from '@/components/ui/button'
import type { TodoItem as TodoItemType } from '@/services'
import { cn } from '@/lib/utils'
import { DeadlineDisplay } from '@/components/DeadlineDisplay'
import { useUpdateTodoMutation, useDeleteTodoMutation } from '@/hooks'

export interface TodoItemProps {
  todo: TodoItemType
  showDelete?: boolean
}

/**
 * Get border color based on board column
 * - Column 1 (Inbox): blue
 * - Column 2 (Todo): red
 * - Column 3 (In Progress): amber
 * - Column 4 (Done): green
 */
const columnBorderColors: Record<number, string> = {
  1: 'border-l-blue-500',
  2: 'border-l-red-500',
  3: 'border-l-amber-500',
  4: 'border-l-green-500',
}

export function TodoItem({ todo, showDelete = false }: TodoItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
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
        columnBorderColors[todo.boardColumnId] || 'border-l-gray-500'
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
              onClick={() => {
                navigate(`/inbox/${todo.emailId}`, {
                  state: {
                    action: 'assist_reply',
                    instruction: todo.description,
                  },
                })
              }}
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
    </div>
  )
}
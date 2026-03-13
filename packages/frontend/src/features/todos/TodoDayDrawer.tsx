import { useState } from 'react'
import { format } from 'date-fns'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteTodoMutation } from '@/hooks/useTodoMutations'
import { TodoEditForm } from './TodoEditForm'
import type { TodoItem, Urgency } from '@/services'

export interface TodoDayDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
}

/**
 * TodoItemMenu - Dropdown menu for todo actions
 * Implements inline delete confirmation to avoid modal disruption
 */
function TodoItemMenu({
  todo,
  onEdit,
}: {
  todo: TodoItem
  onEdit: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMutation = useDeleteTodoMutation()
  const isDeleting = deleteMutation.isPending

  const handleDelete = () => {
    deleteMutation.mutate(todo.id)
    setConfirmDelete(false)
  }

  const handleDeleteClick = (e: Event) => {
    e.preventDefault() // Prevent menu from closing
    setConfirmDelete(true)
  }

  const handleCancelClick = (e: Event) => {
    e.preventDefault() // Prevent menu from closing
    setConfirmDelete(false)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} disabled={isDeleting}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>

        {!confirmDelete ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleDeleteClick}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Confirm delete?
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCancelClick} disabled={isDeleting}>
              Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Get color class for urgency badge
 */
function getUrgencyColor(urgency: Urgency): string {
  switch (urgency) {
    case 'high':
      return 'text-red-500'
    case 'medium':
      return 'text-yellow-600'
    case 'low':
      return 'text-blue-500'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * TodoDayDrawer - Shows todos for a specific day
 *
 * Features:
 * - Displays todos sorted by priority (high → medium → low)
 * - Edit functionality via TodoEditForm
 * - Inline delete confirmation (no modal)
 * - Completed task styling with strikethrough
 */
export function TodoDayDrawer({
  open,
  onOpenChange,
  date,
  todos,
  onTodoClick,
}: TodoDayDrawerProps) {
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)

  // Sort todos by priority: high > medium > low
  const sortedTodos = [...todos].sort((a, b) => {
    const order: Record<Urgency, number> = { high: 3, medium: 2, low: 1 }
    return order[b.urgency] - order[a.urgency]
  })

  const handleCancelEdit = () => {
    setEditingTodo(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {date ? format(date, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </SheetTitle>
          {date && todos.length > 0 && (
            <SheetDescription>
              {todos.length} todo{todos.length !== 1 ? 's' : ''} for this day
            </SheetDescription>
          )}
        </SheetHeader>

        {editingTodo ? (
          <TodoEditForm todo={editingTodo} onCancel={handleCancelEdit} />
        ) : (
          <div className="mt-4">
            {sortedTodos.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No tasks for this day
              </p>
            ) : (
              <ul className="space-y-2" role="list">
                {sortedTodos.map((todo) => (
                  <li
                    key={todo.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                    role="listitem"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onTodoClick?.(todo)}
                    >
                      <p
                        className={cn(
                          'text-sm',
                          todo.status === 'completed' &&
                            'line-through text-muted-foreground'
                        )}
                      >
                        {todo.description}
                      </p>
                      <span
                        className={cn(
                          'text-xs capitalize',
                          getUrgencyColor(todo.urgency)
                        )}
                      >
                        {todo.urgency}
                      </span>
                    </div>
                    <TodoItemMenu
                      todo={todo}
                      onEdit={() => setEditingTodo(todo)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
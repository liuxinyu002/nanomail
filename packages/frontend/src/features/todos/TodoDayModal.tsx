import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { MoreHorizontal, Pencil, Trash2, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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

// Width constants for expand/collapse
const EXPANDED_WIDTH = 'max-w-xl' // 576px
const COMPACT_WIDTH = 'max-w-md' // 448px

// Animation duration for close (must match CSS transition)
const CLOSE_ANIMATION_DURATION = 200

export interface TodoDayModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
}

/**
 * TodoItemMenu - Dropdown menu for todo actions
 *
 * Implements inline delete confirmation to avoid modal disruption.
 * Shows edit and delete options, with delete requiring explicit confirmation.
 *
 * @param todo - The todo item to display actions for
 * @param onEdit - Callback fired when edit action is selected
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
 *
 * Maps urgency levels to semantic color classes for visual distinction.
 *
 * @param urgency - The urgency level ('high', 'medium', 'low')
 * @returns Tailwind CSS color class string
 *
 * @example
 * getUrgencyColor('high') // returns 'text-red-500'
 * getUrgencyColor('medium') // returns 'text-yellow-600'
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
 * TodoDayModal - Modal for viewing and managing todos for a specific day
 *
 * Features:
 * - Expand/collapse toggle between 448px and 576px widths
 * - Auto-expands when entering edit mode
 * - Sticky header with scrollable content
 * - Fade transition between list and edit views
 * - Prevents crash when date becomes null during exit animation
 * - Resets editing and expand state after close animation
 */
export function TodoDayModal({
  open,
  onOpenChange,
  date,
  todos,
  onTodoClick,
}: TodoDayModalProps) {
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  // Ref for timeout cleanup to prevent memory leak
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cache the last valid date to prevent crash during exit animation
  // When parent sets date to null while modal is closing, we still need
  // a valid date to render during the fade-out animation
  const [displayDate, setDisplayDate] = useState<Date | null>(date)

  useEffect(() => {
    // Only update when date is valid (not null)
    if (date) {
      setDisplayDate(date)
    }
    // Do NOT update displayDate when date becomes null
    // This keeps the last valid date during exit animation
  }, [date])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  // Sort todos by priority: high > medium > low
  const sortedTodos = [...todos].sort((a, b) => {
    const order: Record<Urgency, number> = { high: 3, medium: 2, low: 1 }
    return order[b.urgency] - order[a.urgency]
  })

  // Stable event handlers using useCallback
  const handleEditTodo = useCallback((todo: TodoItem) => {
    setEditingTodo(todo)
    setIsExpanded(true) // Auto-expand when entering edit mode
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingTodo(null)
  }, [])

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  // Handle close with delayed state reset to allow exit animation
  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Clear any existing timeout
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
      // Delay reset to allow exit animation to complete
      closeTimeoutRef.current = setTimeout(() => {
        setEditingTodo(null)
        setIsExpanded(false)
        closeTimeoutRef.current = null
      }, CLOSE_ANIMATION_DURATION)
    }
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  // Keyboard handler for todo item click accessibility
  const handleTodoKeyDown = useCallback((e: React.KeyboardEvent, todo: TodoItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTodoClick?.(todo)
    }
  }, [onTodoClick])

  // Format date for display
  const formattedDate = displayDate ? format(displayDate, 'EEEE, MMMM d, yyyy') : 'Select a date'
  const todoCount = todos.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          isExpanded ? EXPANDED_WIDTH : COMPACT_WIDTH,
          'max-h-[85vh] flex flex-col'
        )}
      >
        {/* Sticky Header */}
        <DialogHeader
          role="banner"
          className="shrink-0 sticky top-0 z-10 bg-background border-b pb-4"
        >
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle>{formattedDate}</DialogTitle>
              {displayDate && todoCount > 0 && (
                <DialogDescription>
                  {todoCount} todo{todoCount !== 1 ? 's' : ''} for this day
                </DialogDescription>
              )}
            </div>
            {/* Expand/Collapse Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleExpand}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div
          data-testid="modal-content-area"
          className="flex-1 overflow-y-auto min-h-0"
        >
          {/* Fade transition wrapper between list and edit form */}
          <div className="relative">
            {/* Todo List View */}
            <div
              data-testid="todo-list-container"
              className={cn(
                'transition-opacity duration-200',
                editingTodo ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100'
              )}
            >
              {sortedTodos.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No tasks for this day
                </p>
              ) : (
                <div className="mt-4">
                  <ul className="space-y-2" role="list">
                    {sortedTodos.map((todo) => (
                      <li
                        key={todo.id}
                        className="flex items-start justify-between p-3 border rounded-lg"
                        role="listitem"
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          role="button"
                          tabIndex={onTodoClick ? 0 : -1}
                          onClick={() => onTodoClick?.(todo)}
                          onKeyDown={(e) => handleTodoKeyDown(e, todo)}
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
                          onEdit={() => handleEditTodo(todo)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Edit Form View */}
            <div
              className={cn(
                'transition-opacity duration-200',
                editingTodo ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
              )}
            >
              {editingTodo && (
                <TodoEditForm todo={editingTodo} onCancel={handleCancelEdit} />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
import { useMemo } from 'react'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { DroppableZone } from './DroppableZone'
import { DraggableTodoItem } from './DraggableTodoItem'

export interface InboxPanelProps {
  /** All todos (will be filtered for inbox items) */
  todos: TodoItem[]
  /** Callback fired when a todo is dropped into inbox */
  onDrop?: (todoId: number) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * InboxPanel - Displays todos that belong to the Inbox column (boardColumnId === 1)
 *
 * Critical: This component displays ONLY todos where boardColumnId === 1.
 * This ensures data is mutually exclusive with BoardPanel which displays columns 2-4.
 */
export function InboxPanel({ todos, className }: InboxPanelProps) {
  // Strict filtering: ONLY boardColumnId === 1
  const inboxTodos = useMemo(() => {
    return todos.filter(t => t.boardColumnId === 1)
  }, [todos])

  const isEmpty = inboxTodos.length === 0

  return (
    <div
      data-testid="inbox-panel"
      className={cn('flex flex-col bg-background rounded-lg border', className)}
    >
      {/* Header */}
      <div
        data-testid="panel-header"
        className="p-4 border-b flex items-center justify-between"
      >
        <h2 className="text-lg font-semibold">Inbox</h2>
        <span
          className="text-sm text-muted-foreground"
          aria-label={`${inboxTodos.length} items in inbox`}
        >
          {inboxTodos.length}
        </span>
      </div>

      {/* Content */}
      <DroppableZone
        id="inbox-zone"
        type="inbox"
        className="flex-1 p-4 overflow-auto"
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <p className="text-muted-foreground mb-2">No items in inbox</p>
            <p className="text-sm text-muted-foreground">
              Drag items here to add them to your inbox
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {inboxTodos.map((todo, index) => (
              <DraggableTodoItem key={todo.id} todo={todo} index={index} />
            ))}
          </div>
        )}
      </DroppableZone>
    </div>
  )
}
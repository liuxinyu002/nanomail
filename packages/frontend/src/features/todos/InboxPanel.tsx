import { useMemo } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { TodoItem } from '@/services'
import { cn } from '@/lib/utils'
import { DroppableZone } from './DroppableZone'
import { DraggableTodoItem } from './DraggableTodoItem'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export interface InboxPanelProps {
  /** All todos (will be filtered for inbox items) */
  todos: TodoItem[]
  /** Callback fired when a todo is dropped into inbox */
  onDrop?: (todoId: number) => void
  /** Callback fired when "查看归档的卡片" is clicked */
  onViewArchive?: () => void
  /** Additional CSS classes */
  className?: string
  /** ID of the todo to highlight (for restore animation) */
  highlightedTodoId?: number | null
}

/**
 * InboxPanel - Displays todos that belong to the Inbox column (boardColumnId === 1)
 *
 * Critical: This component displays ONLY todos where boardColumnId === 1.
 * This ensures data is mutually exclusive with BoardPanel which displays columns 2-4.
 */
export function InboxPanel({
  todos,
  onViewArchive,
  className,
  highlightedTodoId,
}: InboxPanelProps) {
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
        <div className="flex items-center gap-2">
          <span
            className="text-sm text-muted-foreground"
            aria-label={`${inboxTodos.length} items in inbox`}
          >
            {inboxTodos.length}
          </span>

          {/* Archive menu - only render when callback is provided */}
          {onViewArchive && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  data-testid="inbox-menu-trigger"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={onViewArchive}
                  data-testid="view-archive-menu-item"
                >
                  查看归档的卡片
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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
              <DraggableTodoItem
                key={todo.id}
                todo={todo}
                index={index}
                isHighlighted={highlightedTodoId === todo.id}
              />
            ))}
          </div>
        )}
      </DroppableZone>
    </div>
  )
}

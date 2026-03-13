import { format } from 'date-fns'
import type { TodoItem } from '@/services'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export interface TodoDayDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
}

/**
 * TodoDayDrawer - Shows todos for a specific day
 *
 * TODO: Phase 7 - Full implementation with:
 * - Todo list display
 * - Edit/delete functionality
 * - Status toggling
 */
export function TodoDayDrawer({
  open,
  onOpenChange,
  date,
  todos,
  onTodoClick,
}: TodoDayDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {date ? format(date, 'MMMM d, yyyy') : 'Select a day'}
          </SheetTitle>
          <SheetDescription>
            {todos.length} todo{todos.length !== 1 ? 's' : ''} for this day
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {todos.length === 0 ? (
            <p className="text-muted-foreground text-sm">No todos for this day</p>
          ) : (
            <ul className="space-y-2">
              {todos.map(todo => (
                <li
                  key={todo.id}
                  className="p-2 border rounded cursor-pointer hover:bg-accent"
                  onClick={() => onTodoClick?.(todo)}
                >
                  <span className="text-sm">{todo.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
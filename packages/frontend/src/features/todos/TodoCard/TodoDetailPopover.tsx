import * as PopoverPrimitive from '@radix-ui/react-popover'
import { X } from 'lucide-react'
import type { Todo } from '@nanomail/shared'
import { TaskDetailExpand } from './TaskDetailExpand'

interface TodoDetailPopoverProps {
  todo: Todo
  children: React.ReactNode
}

/**
 * Popover wrapper for displaying todo details in a floating overlay.
 * Uses Radix UI Popover with smart positioning (priority right with collision detection).
 * Content is displayed in readonly mode.
 */
export function TodoDetailPopover({ todo, children }: TodoDetailPopoverProps) {
  // Placeholder handlers to satisfy TaskDetailExpand's required props interface.
  // In readonly mode, these callbacks are never invoked since the component
  // only renders static text without any editable form elements.
  const handleSaveDescription = () => {}
  const handleSaveNotes = () => {}
  const handleSaveDeadline = () => {}

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        {children}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-testid="todo-detail-popover"
          side="right"
          align="start"
          sideOffset={8}
          className="
            z-[1000] w-80 max-h-[400px] overflow-y-auto
            bg-white border border-gray-200
            shadow-lg rounded-md p-4
            dark:bg-gray-800 dark:border-gray-700
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            data-[state=open]:duration-150 data-[state=closed]:duration-100
            outline-none
          "
        >
          {/* Arrow pointing to trigger */}
          <PopoverPrimitive.Arrow
            data-testid="todo-detail-popover-arrow"
            className="fill-white dark:fill-gray-800"
            width={10}
            height={5}
          />

          {/* Header with title and close button */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
              {todo.description || 'No details'}
            </h4>
            <PopoverPrimitive.Close
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 -mr-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </PopoverPrimitive.Close>
          </div>

          {/* TaskDetailExpand in readonly mode */}
          <TaskDetailExpand
            description={todo.description}
            notes={todo.notes}
            deadline={todo.deadline}
            isExpanded={true}
            readonly={true}
            onSaveDescription={handleSaveDescription}
            onSaveNotes={handleSaveNotes}
            onSaveDeadline={handleSaveDeadline}
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TodoCardHeader } from './TodoCardHeader'
import { TodoCardContent } from './TodoCardContent'
import type { Todo } from '@nanomail/shared'

interface TodoCardProps {
  todo: Todo
  onToggle: () => void
  onDelete?: () => void
  className?: string
  /** Read-only mode: disables editing, hides delete icon */
  readonly?: boolean
  /** Whether to show the delete icon button. Default: true */
  showDelete?: boolean
  /** Optional color bar configuration for compact/planner mode */
  colorBar?: {
    /** Hex color for inline style (e.g., '#FF5733'). Takes precedence over tailwind class. */
    hexColor?: string
    /** Tailwind color class (e.g., 'bg-blue-500') - used as fallback */
    color?: string
  }
  /** Use compact styling for planner/scheduler views */
  compact?: boolean
  /** Ordinal number for sortable tasks (1, 2, 3...) */
  ordinal?: number
  /** Drag handle props from dnd-kit (attributes and listeners) */
  dragHandleProps?: Record<string, unknown>
  onSaveDescription?: (value: string) => void
  onSaveNotes?: (value: string | null) => void
  onSaveDeadline?: (value: string | null) => void
}

/**
 * Main TodoCard component
 * Renders a card with checkbox, title, metadata, and expansion capability
 *
 * Design specifications:
 * - White background with soft shadow
 * - Hover shadow effect
 * - Click to expand/collapse (except on interactive elements)
 * - Completed state shows line-through and opacity
 *
 * Modes:
 * - **Standard mode** (compact=false): Full card with expandable content area.
 *   Used in Inbox and Board views. Clicking the card toggles TaskDetailExpand.
 * - **Compact mode** (compact=true): Minimal card with just checkbox + title.
 *   Used in Planner views. TaskDetailExpand is intentionally NOT rendered here
 *   to keep cards small. Instead, clicking a card in Planner opens a popover
 *   for detail viewing (see PlannerTodoCard for implementation).
 */
export function TodoCard({
  todo,
  onToggle,
  onDelete,
  className,
  readonly = false,
  showDelete = true,
  colorBar,
  compact = false,
  ordinal,
  dragHandleProps,
  onSaveDescription,
  onSaveNotes,
  onSaveDeadline,
}: TodoCardProps) {
  // Expansion state - only used for non-compact mode (Inbox/Board)
  const [isExpanded, setIsExpanded] = useState(false)

  // Derive completed state from status
  const completed = todo.status === 'completed'

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="checkbox"]') ||
      target.closest('textarea') ||
      target.closest('input')
    ) {
      return
    }
    setIsExpanded(!isExpanded)
  }

  // Default no-op handlers for save callbacks
  const handleSaveDescription = (value: string) => {
    onSaveDescription?.(value)
  }

  const handleSaveNotes = (value: string | null) => {
    onSaveNotes?.(value)
  }

  const handleSaveDeadline = (value: string | null) => {
    onSaveDeadline?.(value)
  }

  // Compact mode: minimal styling for planner/scheduler
  // Note: TaskDetailExpand is NOT rendered in compact mode to keep cards minimal.
  // Detail viewing in Planner uses a popover-based approach instead.
  if (compact) {
    // Determine color bar styling - prefer hex color for inline style
    const colorBarStyle = colorBar?.hexColor
      ? { backgroundColor: colorBar.hexColor }
      : undefined
    const colorBarClass = colorBar?.hexColor ? undefined : colorBar?.color

    return (
      <div
        data-testid="todo-card"
        className={cn(
          'bg-white border border-gray-100 rounded-sm',
          'hover:bg-gray-50 transition-colors',
          className
        )}
      >
        {/* Header row - always visible */}
        <div className="flex items-center gap-1.5 px-1.5 py-1">
          {/* Color bar */}
          {colorBar && (
            <div
              data-testid="todo-card-color-bar"
              className={cn('w-1 h-4 rounded-full shrink-0', colorBarClass)}
              style={colorBarStyle}
              aria-hidden="true"
            />
          )}

          {/* Checkbox */}
          <button
            type="button"
            role="checkbox"
            aria-checked={completed}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className={cn(
              'shrink-0 w-3.5 h-3.5 rounded-sm border transition-colors',
              'flex items-center justify-center',
              completed
                ? 'bg-[#2563EB] border-[#2563EB]'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            {completed && (
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>

          {/* Title - truncated to single line */}
          <span
            className={cn(
              'text-xs text-gray-900 truncate flex-1',
              completed && 'line-through opacity-50'
            )}
          >
            {todo.description}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="todo-card"
      onClick={handleCardClick}
      className={cn(
        'bg-white rounded-md cursor-pointer',
        'shadow-sm',
        'hover:shadow-md',
        'transition-shadow',
        'p-4 mb-2',
        'border border-gray-100',
        className
      )}
    >
      <TodoCardHeader
        description={todo.description}
        completed={completed}
        onToggle={onToggle}
        onDelete={onDelete}
        isExpanded={isExpanded}
        showDelete={showDelete && !readonly}
        ordinal={ordinal}
        dragHandleProps={dragHandleProps}
      />

      <TodoCardContent
        todo={{
          id: todo.id,
          description: todo.description,
          notes: todo.notes,
          deadline: todo.deadline,
          emailId: todo.emailId,
        }}
        isExpanded={isExpanded}
        readonly={readonly}
        onSaveDescription={handleSaveDescription}
        onSaveNotes={handleSaveNotes}
        onSaveDeadline={handleSaveDeadline}
      />
    </div>
  )
}

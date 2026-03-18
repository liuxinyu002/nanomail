import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TodoCardHeader } from './TodoCardHeader'
import { TodoCardContent } from './TodoCardContent'
import type { Todo } from '@nanomail/shared'

interface TodoCardProps {
  todo: Todo
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
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
 */
export function TodoCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
  className,
}: TodoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Derive completed state from status
  const completed = todo.status === 'completed'

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="checkbox"]')
    ) {
      return
    }
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      data-testid="todo-card"
      onClick={handleCardClick}
      className={cn(
        'bg-white rounded-md cursor-pointer',
        'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]',
        'hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08)]',
        'transition-shadow',
        'p-4 mb-2',
        className
      )}
    >
      <TodoCardHeader
        description={todo.description}
        completed={completed}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        isExpanded={isExpanded}
      />

      <TodoCardContent
        deadline={todo.deadline}
        emailId={todo.emailId}
        isExpanded={isExpanded}
      />
    </div>
  )
}
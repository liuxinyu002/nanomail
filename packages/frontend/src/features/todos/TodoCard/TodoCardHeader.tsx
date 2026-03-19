import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { DeleteIconButton } from './DeleteIconButton'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodoCardHeaderProps {
  description: string
  completed: boolean
  onToggle: () => void
  onDelete?: () => void
  isExpanded?: boolean
  /** Whether to show the delete icon button. Default: true */
  showDelete?: boolean
  /** Ordinal number for sortable tasks (1, 2, 3...) */
  ordinal?: number
  /** Drag handle props from dnd-kit (attributes and listeners) */
  dragHandleProps?: Record<string, unknown>
}

/**
 * Header component for TodoCard
 * Contains checkbox, title, and delete icon button
 *
 * Phase 2: Implements hover-swap pattern for sortable tasks:
 * - Default: Shows ordinal badge (1., 2., etc.)
 * - Hover: Badge swaps to drag handle icon
 */
export function TodoCardHeader({
  description,
  completed,
  onToggle,
  onDelete,
  isExpanded = false,
  showDelete = true,
  ordinal,
  dragHandleProps,
}: TodoCardHeaderProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Show drag handle when hovered AND both ordinal and dragHandleProps are provided
  const showDragHandle = isHovered && ordinal !== undefined && dragHandleProps

  return (
    <div
      data-testid="todo-card-header"
      className="flex items-start gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ordinal Badge / Drag Handle - same slot, swap on hover */}
      {ordinal !== undefined && (
        <div
          data-testid="ordinal-slot"
          className="shrink-0 w-6 flex items-center justify-center mt-0.5"
        >
          {showDragHandle ? (
            <button
              data-testid="drag-handle"
              type="button"
              className={cn(
                'cursor-grab active:cursor-grabbing',
                'text-gray-400 hover:text-gray-600',
                'touch-none'
              )}
              {...dragHandleProps}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          ) : (
            <span
              data-testid="ordinal-badge"
              className="text-xs text-gray-400 font-medium tabular-nums"
            >
              {ordinal}.
            </span>
          )}
        </div>
      )}

      {/* Checkbox with brand color */}
      <Checkbox
        checked={completed}
        onCheckedChange={onToggle}
        className={cn(
          'mt-0.5 border-[#6B7280]',
          'data-[state=checked]:bg-[#2563EB]',
          'data-[state=checked]:border-[#2563EB]'
        )}
      />

      {/* Title with line-clamp-2 by default */}
      <p
        data-testid="todo-card-title"
        className={cn(
          'flex-1 text-[#111827] font-medium',
          !isExpanded && 'line-clamp-2',
          completed && 'line-through opacity-50'
        )}
      >
        {description}
      </p>

      {/* Delete icon button - only show when showDelete=true AND onDelete is provided */}
      {showDelete && onDelete && (
        <DeleteIconButton onDelete={onDelete} />
      )}
    </div>
  )
}
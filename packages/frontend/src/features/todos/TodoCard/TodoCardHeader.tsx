import { Checkbox } from '@/components/ui/checkbox'
import { DeleteIconButton } from './DeleteIconButton'
import { cn } from '@/lib/utils'

interface TodoCardHeaderProps {
  description: string
  completed: boolean
  onToggle: () => void
  onDelete?: () => void
  isExpanded?: boolean
  /** Whether to show the delete icon button. Default: true */
  showDelete?: boolean
}

/**
 * Header component for TodoCard
 * Contains checkbox, title, and delete icon button
 */
export function TodoCardHeader({
  description,
  completed,
  onToggle,
  onDelete,
  isExpanded = false,
  showDelete = true,
}: TodoCardHeaderProps) {
  return (
    <div className="flex items-start gap-3">
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

import { cn } from '@/lib/utils'
import { DeadlineChip } from './DeadlineChip'
import { EmailLinkIcon } from './EmailLinkIcon'

interface TodoCardContentProps {
  deadline?: Date | string | null
  emailId?: string | number | null
  isExpanded: boolean
}

/**
 * Content component for TodoCard
 * Displays metadata (deadline, email link) and expandable area
 *
 * Note: The `details` field was removed from the schema,
 * so the expandable area is currently empty but ready for future use.
 */
export function TodoCardContent({
  deadline,
  emailId,
  isExpanded,
}: TodoCardContentProps) {
  const hasMetadata = deadline || emailId

  return (
    <>
      {/* Metadata row - visible when there's metadata */}
      {hasMetadata && (
        <div className="flex items-center gap-3 pt-2">
          {deadline && <DeadlineChip deadline={deadline} />}
          {emailId && <EmailLinkIcon emailId={emailId} />}
        </div>
      )}

      {/* Expandable area - using CSS grid for smooth animation */}
      <div
        data-testid="todo-card-expandable"
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isExpanded ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'
        )}
      >
        <div className="overflow-hidden">
          {/* Future: Details or additional content can go here */}
          {/* Currently no details field in Todo schema */}
        </div>
      </div>
    </>
  )
}
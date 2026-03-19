import { DeadlineChip } from './DeadlineChip'
import { EmailLinkIcon } from './EmailLinkIcon'
import { TaskDetailExpand } from './TaskDetailExpand'

interface TodoCardContentProps {
  todo: {
    id: number
    description: string
    notes: string | null
    deadline: string | null
    emailId?: number | null
  }
  isExpanded: boolean
  readonly?: boolean
  onSaveDescription: (value: string) => void
  onSaveNotes: (value: string | null) => void
  onSaveDeadline: (value: string | null) => void
}

/**
 * Content component for TodoCard
 * Displays metadata (deadline, email link) and expandable detail area
 *
 * Behavior:
 * - Metadata row is visible only when collapsed
 * - TaskDetailExpand shows description, notes, and deadline when expanded
 */
export function TodoCardContent({
  todo,
  isExpanded,
  readonly = false,
  onSaveDescription,
  onSaveNotes,
  onSaveDeadline,
}: TodoCardContentProps) {
  const hasMetadata = todo.deadline || todo.emailId

  return (
    <>
      {/* Metadata row - visible only when collapsed */}
      {!isExpanded && hasMetadata && (
        <div className="flex items-center gap-3 pt-2">
          {todo.deadline && <DeadlineChip deadline={todo.deadline} />}
          {todo.emailId && <EmailLinkIcon emailId={todo.emailId} />}
        </div>
      )}

      {/* Expandable detail area */}
      <TaskDetailExpand
        description={todo.description}
        notes={todo.notes}
        deadline={todo.deadline}
        isExpanded={isExpanded}
        readonly={readonly}
        onSaveDescription={onSaveDescription}
        onSaveNotes={onSaveNotes}
        onSaveDeadline={onSaveDeadline}
      />
    </>
  )
}

import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface DeadlineDisplayProps {
  deadline: string | null // ISO format
}

export function DeadlineDisplay({ deadline }: DeadlineDisplayProps) {
  if (!deadline) {
    return (
      <span className="text-xs text-muted-foreground">No deadline</span>
    )
  }

  const deadlineDate = new Date(deadline)
  const now = new Date()
  const isOverdue = deadlineDate < now
  const hoursUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  const isUrgent = !isOverdue && hoursUntil <= 24

  const formatted = deadlineDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isOverdue && 'text-red-600',
        isUrgent && 'text-amber-600',
        !isOverdue && !isUrgent && 'text-muted-foreground'
      )}
    >
      {(isOverdue || isUrgent) && (
        <AlertTriangle className="h-3 w-3" />
      )}
      {isOverdue && 'Overdue: '}
      {isUrgent && !isOverdue && 'Due today: '}
      {formatted}
    </span>
  )
}
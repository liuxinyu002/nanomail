import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle, Inbox } from 'lucide-react'

export interface EmailCardProps {
  email: {
    id: number
    sender: string | null
    subject: string | null
    snippet: string | null
    date: Date
    isProcessed: boolean
    isSpam: boolean
  }
  selected: boolean
  onSelect: (id: number) => void
  selectionDisabled?: boolean
}

/**
 * Format a date relative to now (e.g., "2 days ago")
 */
function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes === 0) {
        return 'just now'
      }
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    }
    if (diffHours === 1) {
      return '1 hour ago'
    }
    return `${diffHours} hours ago`
  }
  if (diffDays === 1) {
    return 'yesterday'
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`
  }
  return date.toLocaleDateString()
}

export function EmailCard({
  email,
  selected,
  onSelect,
  selectionDisabled = false,
}: EmailCardProps) {
  const isDisabled = selectionDisabled && !selected
  const isSpam = email.isSpam

  const handleClick = () => {
    if (!isDisabled) {
      onSelect(email.id)
    }
  }

  return (
    <div
      className={cn(
        'p-4 rounded-lg transition-colors cursor-pointer',
        selected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted',
        isSpam && 'opacity-60'
      )}
      onClick={handleClick}
      data-testid="email-card"
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={handleClick}
          disabled={isDisabled}
          data-testid="email-checkbox"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium truncate">
              {email.sender || 'Unknown sender'}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelativeDate(email.date)}
            </span>
          </div>

          <p className="text-sm font-medium truncate">
            {email.subject || '(No subject)'}
          </p>

          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {email.snippet || ''}
          </p>
        </div>

        {email.isProcessed && (
          <CheckCircle
            className="h-5 w-5 text-green-500 shrink-0"
            data-testid="processed-indicator"
          />
        )}
      </div>
    </div>
  )
}

/**
 * Empty state component for inbox
 */
export function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox
        className="h-12 w-12 text-muted-foreground/30 mb-4"
        data-testid="inbox-icon"
      />
      <p className="text-muted-foreground/60 text-sm">Your inbox is clear</p>
    </div>
  )
}
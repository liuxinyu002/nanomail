import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle, Inbox, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { EmailClassification } from '@nanomail/shared'
import { ClassificationTag } from '@/components/ClassificationTag'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export interface EmailCardProps {
  email: {
    id: number
    sender: string | null
    subject: string | null
    snippet: string | null
    date: Date
    isProcessed: boolean
    classification: EmailClassification
    summary: string | null
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
  const [isExpanded, setIsExpanded] = useState(false)
  const isDisabled = selectionDisabled && !selected
  // Compute isSpam from classification
  const isSpam = email.classification === 'SPAM'
  // Computed properties for summary expansion
  const canExpand = email.isProcessed && email.summary !== null
  const showSparkles = !email.isProcessed

  const handleCardBodyClick = () => {
    if (canExpand) {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className={cn(
        'p-4 rounded-lg transition-colors',
        canExpand && 'cursor-pointer hover:bg-muted',
        selected && 'bg-primary/10 border border-primary',
        isSpam && 'opacity-60'
      )}
      data-testid="email-card"
    >
      <div className="flex items-start gap-3" onClick={handleCardBodyClick}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => {
            if (!isDisabled) {
              onSelect(email.id)
            }
          }}
          disabled={isDisabled}
          data-testid="email-checkbox"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">
                {email.sender || 'Unknown sender'}
              </span>
              <ClassificationTag classification={email.classification} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {showSparkles && (
                <Sparkles
                  className="h-4 w-4 text-muted-foreground opacity-50"
                  data-testid="sparkles-indicator"
                />
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeDate(email.date)}
              </span>
            </div>
          </div>

          <p className="text-sm font-medium truncate">
            {email.subject || '(No subject)'}
          </p>

          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {email.snippet || ''}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {email.isProcessed && !canExpand && (
            <CheckCircle
              className="h-5 w-5 text-green-500"
              data-testid="processed-indicator"
            />
          )}
          {canExpand && (
            <CollapsibleTrigger asChild>
              <div
                onClick={(e) => e.stopPropagation()}
                data-testid="expand-trigger"
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
          )}
        </div>
      </div>

      <CollapsibleContent>
        <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground leading-relaxed">
          {email.summary}
        </div>
      </CollapsibleContent>
    </Collapsible>
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
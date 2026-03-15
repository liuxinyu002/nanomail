import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatRelativeDate } from '@/lib/date-format'
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
  /** Currently viewed email ID for active state styling */
  activeId?: number
  /** Callback when card is clicked to navigate to detail view */
  onCardClick?: (id: number) => void
}

export function EmailCard({
  email,
  selected,
  onSelect,
  selectionDisabled = false,
  activeId,
  onCardClick,
}: EmailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isDisabled = selectionDisabled && !selected
  // Compute isSpam from classification
  const isSpam = email.classification === 'SPAM'
  // Computed properties for summary expansion
  const canExpand = email.isProcessed && email.summary !== null
  const showSparkles = !email.isProcessed
  // Active state: check if this card is the currently viewed email
  // Note: activeId must be a positive number (email IDs start from 1)
  const isActive = typeof activeId === 'number' && !Number.isNaN(activeId) && activeId > 0 && email.id === activeId
  // Card is interactive if it can expand or has a click handler
  const isInteractive = canExpand || !!onCardClick

  const handleCardBodyClick = () => {
    if (onCardClick) {
      onCardClick(email.id)
    } else if (canExpand) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault() // Prevent page scroll on Space
      if (onCardClick) {
        onCardClick(email.id)
      } else if (canExpand) {
        setIsExpanded(!isExpanded)
      }
    }
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      className={cn(
        'p-4 rounded-lg transition-colors',
        canExpand && 'cursor-pointer hover:bg-muted',

        // Background color: selected takes priority over active
        selected ? 'bg-primary/10' : (isActive ? 'bg-blue-50' : 'bg-transparent'),

        // Border styling
        selected ? 'border border-primary' : 'border border-transparent',

        // Active state: always show left border indicator
        isActive && 'border-l-4 border-l-blue-600',

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
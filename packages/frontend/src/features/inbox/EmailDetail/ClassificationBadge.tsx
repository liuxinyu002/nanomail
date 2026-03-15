import { cn } from '@/lib/utils'
import type { EmailClassification } from '@nanomail/shared'

interface ClassificationBadgeProps {
  classification: EmailClassification
  className?: string
}

const STYLES: Record<EmailClassification, string> = {
  IMPORTANT: 'bg-red-100 text-red-700',
  NEWSLETTER: 'bg-blue-100 text-blue-700',
  SPAM: 'bg-gray-100 text-gray-600',
}

const LABELS: Record<EmailClassification, string> = {
  IMPORTANT: 'Important',
  NEWSLETTER: 'Newsletter',
  SPAM: 'Spam',
}

export function ClassificationBadge({ classification, className }: ClassificationBadgeProps) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        STYLES[classification],
        className
      )}
      role="span"
    >
      {LABELS[classification]}
    </span>
  )
}
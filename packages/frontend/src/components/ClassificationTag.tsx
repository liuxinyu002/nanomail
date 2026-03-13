import { cn } from '@/lib/utils'
import type { EmailClassification } from '@nanomail/shared'

interface ClassificationTagProps {
  classification: EmailClassification | undefined | null
  size?: 'sm' | 'md'
}

const config: Record<EmailClassification, { label: string; className: string }> = {
  IMPORTANT: {
    label: 'Important',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  NEWSLETTER: {
    label: 'Newsletter',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  SPAM: {
    label: 'Spam',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
}

export function ClassificationTag({ classification, size = 'sm' }: ClassificationTagProps) {
  // Don't render if classification is undefined/null/invalid
  if (!classification || !config[classification]) {
    return null
  }

  const { label, className } = config[classification]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 font-medium',
        size === 'sm' ? 'text-xs' : 'text-sm px-2 py-0.5',
        className
      )}
    >
      {label}
    </span>
  )
}
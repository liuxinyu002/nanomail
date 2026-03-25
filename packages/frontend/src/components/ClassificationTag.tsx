import { cn } from '@/lib/utils'
import type { EmailClassification } from '@nanomail/shared'

interface ClassificationTagProps {
  classification: EmailClassification | undefined | null
  size?: 'sm' | 'md'
  /** Visual style variant */
  variant?: 'default' | 'solid'
}

const config: Record<EmailClassification, { label: string; default: string; solid: string }> = {
  IMPORTANT: {
    label: '重要',
    default: 'bg-red-100 text-red-700 border-red-200',
    solid: 'bg-red-100 text-red-700',
  },
  NEWSLETTER: {
    label: '订阅',
    default: 'bg-blue-100 text-blue-700 border-blue-200',
    solid: 'bg-blue-100 text-blue-700',
  },
  SPAM: {
    label: '垃圾',
    default: 'bg-gray-100 text-gray-600 border-gray-200',
    solid: 'bg-gray-200 text-gray-500',
  },
}

export function ClassificationTag({ classification, size = 'sm', variant = 'default' }: ClassificationTagProps) {
  // Don't render if classification is undefined/null/invalid
  if (!classification || !config[classification]) {
    return null
  }

  const { label } = config[classification]
  const variantStyles = config[classification][variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 font-medium whitespace-nowrap',
        variant === 'default' && 'border',
        size === 'sm' ? 'text-xs' : 'text-sm px-2 py-0.5',
        variantStyles
      )}
    >
      {label}
    </span>
  )
}
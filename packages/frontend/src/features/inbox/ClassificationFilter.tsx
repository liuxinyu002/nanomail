import { cn } from '@/lib/utils'
import type { EmailClassification } from '@nanomail/shared'

interface ClassificationFilterProps {
  value: EmailClassification | 'ALL'
  onChange: (value: EmailClassification | 'ALL') => void
}

const options: Array<{ value: EmailClassification | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'IMPORTANT', label: '重要' },
  { value: 'NEWSLETTER', label: '订阅' },
  { value: 'SPAM', label: '垃圾' },
]

export function ClassificationFilter({ value, onChange }: ClassificationFilterProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
            value === option.value
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
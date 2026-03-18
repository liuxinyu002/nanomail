import { Calendar } from 'lucide-react'

interface DeadlineChipProps {
  deadline: Date | string
}

/**
 * Displays a formatted deadline with a calendar icon
 * Used within TodoCardContent to show task deadlines
 */
export function DeadlineChip({ deadline }: DeadlineChipProps) {
  const formatted = formatDate(deadline)

  return (
    <span
      data-testid="deadline-chip"
      className="flex items-center gap-1 text-[#6B7280] text-sm"
    >
      <Calendar className="w-3.5 h-3.5" />
      {formatted}
    </span>
  )
}

/**
 * Formats a date to Chinese format
 * e.g., "12月25日" or "3月15日"
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}
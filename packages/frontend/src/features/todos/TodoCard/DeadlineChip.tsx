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
 * Formats a date to MM-DD HH:mm format
 * e.g., "03-19 09:30"
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}
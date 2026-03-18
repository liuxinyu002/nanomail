import { cn } from '@/lib/utils'

export interface TimeAxisProps {
  className?: string
}

/**
 * TimeAxis component renders a column of 24 hour labels (00:00 - 23:00)
 * for use in Day/Week view scheduler.
 *
 * Each hour slot has a fixed height of 60px to align with HourSlot components.
 */
export function TimeAxis({ className }: TimeAxisProps) {
  return (
    <div
      data-testid="time-axis"
      aria-label="Time axis"
      className={cn('w-16 shrink-0', className)}
    >
      {Array.from({ length: 24 }).map((_, hour) => (
        <div
          key={hour}
          data-testid={`time-axis-slot-${hour}`}
          role="presentation"
          className="h-[60px] flex items-start justify-end pr-2"
        >
          <span
            data-testid={`time-axis-hour-${hour}`}
            className="text-xs text-muted-foreground"
          >
            {hour.toString().padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}
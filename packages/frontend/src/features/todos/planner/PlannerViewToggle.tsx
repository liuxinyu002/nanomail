import { cn } from '@/lib/utils'

export interface PlannerViewToggleProps {
  value: 'day' | 'week'
  onChange: (value: 'day' | 'week') => void
  className?: string
}

/**
 * PlannerViewToggle - Segmented control for switching between day and week views.
 *
 * Features:
 * - Segmented control style (pill buttons side by side)
 * - Labels: "日" and "周"
 * - Active state: bg-primary text-primary-foreground
 * - Inactive: bg-transparent text-muted-foreground hover:bg-muted
 * - No scale effects (per design system)
 */
export function PlannerViewToggle({ value, onChange, className }: PlannerViewToggleProps) {
  return (
    <div
      data-testid="planner-view-toggle"
      className={cn('flex', className)}
    >
      <button
        type="button"
        onClick={() => onChange('day')}
        className={cn(
          'px-3 py-1 text-sm font-medium rounded-md transition-colors',
          value === 'day'
            ? 'bg-primary text-primary-foreground'
            : 'bg-transparent text-muted-foreground hover:bg-muted'
        )}
      >
        日
      </button>
      <button
        type="button"
        onClick={() => onChange('week')}
        className={cn(
          'px-3 py-1 text-sm font-medium rounded-md transition-colors',
          value === 'week'
            ? 'bg-primary text-primary-foreground'
            : 'bg-transparent text-muted-foreground hover:bg-muted'
        )}
      >
        周
      </button>
    </div>
  )
}
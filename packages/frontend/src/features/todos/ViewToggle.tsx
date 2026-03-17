import { cn } from '@/lib/utils'

export type ViewType = 'inbox' | 'planner' | 'board'

export interface ViewToggleProps {
  /** Array of currently active views */
  activeViews: ViewType[]
  /** Callback fired when a view is toggled */
  onToggle: (view: ViewType) => void
  /** Additional CSS classes */
  className?: string
}

const VIEW_CONFIG: { type: ViewType; label: string }[] = [
  { type: 'inbox', label: 'Inbox' },
  { type: 'planner', label: 'Planner' },
  { type: 'board', label: 'Board' },
]

/**
 * ViewToggle - Pill-style toggle buttons for switching between views
 *
 * Features:
 * - Multi-select with minimum-one constraint
 * - Glassmorphism design
 * - Floating at bottom center
 * - Animated selection indicators
 */
export function ViewToggle({ activeViews, onToggle, className }: ViewToggleProps) {
  const handleClick = (view: ViewType) => {
    const activeCount = activeViews.length
    const isCurrentlyActive = activeViews.includes(view)

    // Prevent deselecting the last active view
    if (isCurrentlyActive && activeCount === 1) {
      return
    }

    onToggle(view)
  }

  return (
    <div
      data-testid="view-toggle"
      role="group"
      aria-label="View toggle"
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2',
        'bg-white/80 backdrop-blur-md shadow-lg',
        'rounded-full p-1 flex gap-1',
        'z-50',
        className
      )}
    >
      {VIEW_CONFIG.map(({ type, label }) => {
        const isActive = activeViews.includes(type)

        return (
          <button
            key={type}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleClick(type)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium',
              'transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
import { cn } from '@/lib/utils'

export type EmptyStateVariant = 'default' | 'completed' | 'archive'

export interface EmptyStateProps {
  /** Variant determines the default message and SVG illustration */
  variant?: EmptyStateVariant
  /** Custom message to display (overrides variant default) */
  message?: string
  /** Additional CSS classes */
  className?: string
}

const MESSAGES: Record<EmptyStateVariant, string> = {
  default: 'No tasks yet',
  completed: 'All done!',
  archive: 'No archived tasks',
}

const ARIA_LABELS: Record<EmptyStateVariant, string> = {
  default: 'Empty task list illustration',
  completed: 'Completed tasks illustration',
  archive: 'Archived tasks illustration',
}

/**
 * EmptyState - A flat SVG-based empty state component with macaron/pastel colors
 *
 * Features:
 * - Flat SVG illustrations (no 3D assets)
 * - Macaron/pastel color palette
 * - Multiple variants for different contexts
 * - Accessible with proper ARIA labels
 */
export function EmptyState({
  variant = 'default',
  message,
  className,
}: EmptyStateProps) {
  const displayMessage = message || MESSAGES[variant]

  return (
    <div
      data-testid="empty-state"
      className={cn(
        'flex flex-col items-center justify-center py-12',
        className
      )}
    >
      <EmptyStateSVG variant={variant} />
      <p className="text-[#6B7280] text-sm text-center mt-4">
        {displayMessage}
      </p>
    </div>
  )
}

function EmptyStateSVG({ variant }: { variant: EmptyStateVariant }) {
  switch (variant) {
    case 'completed':
      return <CompletedSVG />
    case 'archive':
      return <ArchiveSVG />
    default:
      return <DefaultSVG />
  }
}

/**
 * Default SVG - Empty task list illustration
 * Uses flat design with macaron colors
 */
function DefaultSVG() {
  return (
    <svg
      data-testid="empty-state-svg"
      className="w-32 h-32 mb-4"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ARIA_LABELS.default}
    >
      {/* Background circle - Pastel Blue */}
      <circle cx="64" cy="64" r="48" fill="#B8D4FF" fillOpacity="0.4" />

      {/* Document/Task icon - Pastel Green */}
      <rect
        x="44"
        y="40"
        width="40"
        height="48"
        rx="4"
        fill="#B8E6C1"
        fillOpacity="0.8"
      />

      {/* Lines representing text - Pastel Purple */}
      <rect x="52" y="52" width="24" height="4" rx="2" fill="#D4B8FF" fillOpacity="0.6" />
      <rect x="52" y="62" width="20" height="4" rx="2" fill="#D4B8FF" fillOpacity="0.6" />
      <rect x="52" y="72" width="16" height="4" rx="2" fill="#D4B8FF" fillOpacity="0.6" />

      {/* Plus icon - Pastel Orange */}
      <circle cx="88" cy="80" r="12" fill="#FFD8A8" fillOpacity="0.8" />
      <path
        d="M88 74V86M82 80H94"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  )
}

/**
 * Completed SVG - All tasks done illustration
 * Uses flat design with macaron colors
 */
function CompletedSVG() {
  return (
    <svg
      data-testid="empty-state-svg"
      className="w-32 h-32 mb-4"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ARIA_LABELS.completed}
    >
      {/* Background circle - Pastel Green */}
      <circle cx="64" cy="64" r="48" fill="#B8E6C1" fillOpacity="0.4" />

      {/* Checkmark circle - Pastel Yellow */}
      <circle cx="64" cy="64" r="32" fill="#FFF4B8" fillOpacity="0.8" />

      {/* Checkmark */}
      <path
        d="M48 64L58 74L80 52"
        stroke="#111827"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />

      {/* Celebration dots - Pastel Purple */}
      <circle cx="40" cy="40" r="4" fill="#D4B8FF" fillOpacity="0.6" />
      <circle cx="88" cy="40" r="4" fill="#D4B8FF" fillOpacity="0.6" />
      <circle cx="40" cy="88" r="4" fill="#D4B8FF" fillOpacity="0.6" />
      <circle cx="88" cy="88" r="4" fill="#D4B8FF" fillOpacity="0.6" />
    </svg>
  )
}

/**
 * Archive SVG - Archived tasks illustration
 * Uses flat design with macaron colors
 */
function ArchiveSVG() {
  return (
    <svg
      data-testid="empty-state-svg"
      className="w-32 h-32 mb-4"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={ARIA_LABELS.archive}
    >
      {/* Background circle - Pastel Purple */}
      <circle cx="64" cy="64" r="48" fill="#D4B8FF" fillOpacity="0.4" />

      {/* Archive box - Pastel Blue */}
      <rect
        x="36"
        y="48"
        width="56"
        height="40"
        rx="4"
        fill="#B8D4FF"
        fillOpacity="0.8"
      />

      {/* Box lid line */}
      <rect x="36" y="48" width="56" height="8" rx="2" fill="#B8D4FF" fillOpacity="0.6" />

      {/* Archive slots - Pastel Orange */}
      <rect x="48" y="64" width="32" height="4" rx="2" fill="#FFD8A8" fillOpacity="0.6" />
      <rect x="48" y="72" width="24" height="4" rx="2" fill="#FFD8A8" fillOpacity="0.6" />

      {/* Down arrow - Pastel Red */}
      <path
        d="M64 28L64 44M58 38L64 44L70 38"
        stroke="#FFB5BA"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
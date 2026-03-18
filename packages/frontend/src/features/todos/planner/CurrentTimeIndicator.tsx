import { useState, useEffect, memo } from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export interface CurrentTimeIndicatorProps {
  containerRef: React.RefObject<HTMLElement | null>
  className?: string
}

/**
 * CurrentTimeIndicator component displays a red line and dot indicating
 * the current time position in the scheduler timeline.
 *
 * - Red dot: 8px circle positioned at the time axis side
 * - Red line: Horizontal line extending across the timeline
 * - Position updates every minute
 *
 * Position calculation: hours * 60 + minutes (each hour = 60px, each minute = 1px)
 */
export const CurrentTimeIndicator = memo(function CurrentTimeIndicator({
  containerRef,
  className,
}: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      // Calculate position: each hour = 60px, each minute = 1px
      setPosition(hours * 60 + minutes)
      setCurrentTime(now)
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const timeLabel = format(currentTime, 'HH:mm')

  return (
    <div
      data-testid="current-time-indicator"
      role="presentation"
      aria-label={`Current time: ${timeLabel}`}
      className={cn(
        'absolute left-0 right-0 flex items-center z-10 pointer-events-none',
        className
      )}
      style={{ top: `${position}px` }}
    >
      {/* Red dot indicator */}
      <div
        data-testid="current-time-dot"
        className="w-2 h-2 rounded-full bg-red-500 ml-14"
      />
      {/* Red horizontal line */}
      <div
        data-testid="current-time-line"
        className="flex-1 h-[2px] bg-red-500"
      />
    </div>
  )
})
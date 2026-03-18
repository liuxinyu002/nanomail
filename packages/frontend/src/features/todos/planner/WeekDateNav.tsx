import { cn } from '@/lib/utils'
import { addDays, format, isSameDay, isToday } from 'date-fns'

export interface WeekDateNavProps {
  /** Week start date (Sunday) */
  weekStart: Date
  /** Currently selected date */
  selectedDate: Date
  /** Callback when selected date changes */
  onDateSelect: (date: Date) => void
  /** Callback when week changes */
  onWeekChange: (direction: 'prev' | 'next') => void
  className?: string
}

// Chinese weekday abbreviations
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/**
 * WeekDateNav - Week navigation component with date selection.
 *
 * Features:
 * - Displays 7 days of the current week
 * - Chinese weekday labels (日、一、二...六)
 * - Selected date highlighted with blue background
 * - Today indicator with blue text and dot (when not selected)
 * - Left/right arrows for week navigation
 */
export function WeekDateNav({
  weekStart,
  selectedDate,
  onDateSelect,
  onWeekChange,
  className,
}: WeekDateNavProps) {
  // Generate 7 days of the week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div
      data-testid="week-date-nav"
      className={cn('flex items-center gap-1', className)}
    >
      {/* Left Arrow */}
      <button
        type="button"
        onClick={() => onWeekChange('prev')}
        className="p-2 text-gray-500 hover:text-gray-700"
        aria-label="上一周"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Date Items */}
      <div className="flex items-center gap-1">
        {days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate)
          const isTodayDate = isToday(date)
          const weekdayLabel = WEEKDAY_LABELS[index]
          const dayNumber = format(date, 'd')

          return (
            <button
              key={index}
              type="button"
              data-testid={`date-item-${index}`}
              onClick={() => onDateSelect(date)}
              className={cn(
                'flex flex-col items-center px-3 py-2 rounded-md text-center',
                // Selected state (highest priority)
                isSelected && 'bg-blue-600 text-white',
                // Today state (when not selected)
                !isSelected && isTodayDate && 'text-blue-600 font-bold',
                // Normal state hover
                !isSelected && !isTodayDate && 'hover:bg-gray-50'
              )}
            >
              <span className="text-xs">{weekdayLabel}</span>
              <span className="text-sm">{dayNumber}</span>
              {/* Today dot indicator (only when not selected) */}
              {isTodayDate && !isSelected && (
                <span className="today-dot mt-0.5 h-1 w-1 rounded-full bg-blue-600" />
              )}
            </button>
          )
        })}
      </div>

      {/* Right Arrow */}
      <button
        type="button"
        onClick={() => onWeekChange('next')}
        className="p-2 text-gray-500 hover:text-gray-700"
        aria-label="下一周"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
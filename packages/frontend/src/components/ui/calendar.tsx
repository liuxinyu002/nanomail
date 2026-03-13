import { useState, useEffect } from 'react'
import {
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export interface CalendarProps {
  selected?: Date | null
  onSelect: (date: Date) => void
  disabled?: (date: Date) => boolean
}

/**
 * Calendar - A custom calendar component for date selection
 *
 * Avoids browser inconsistencies of native input[type="date"]
 * Uses date-fns for date manipulation
 */
export function Calendar({ selected, onSelect, disabled }: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(selected ?? new Date())

  // Sync viewMonth when selected prop changes externally
  useEffect(() => {
    if (selected) {
      setViewMonth(selected)
    }
  }, [selected])

  const monthStart = startOfMonth(viewMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePreviousMonth = () => {
    setViewMonth(subMonths(viewMonth, 1))
  }

  const handleNextMonth = () => {
    setViewMonth(addMonths(viewMonth, 1))
  }

  const handleDateClick = (day: Date) => {
    if (disabled?.(day)) return
    onSelect(day)
  }

  return (
    <div className="p-3 w-72">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div
            key={day}
            className="text-xs text-muted-foreground text-center h-8 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, viewMonth)
          const isSelected = selected && isSameDay(day, selected)
          const isDisabled = disabled?.(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              disabled={isDisabled}
              className={cn(
                'h-8 w-8 text-sm rounded-md transition-colors',
                !isCurrentMonth && 'text-muted-foreground/50',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && isCurrentMonth && 'hover:bg-accent',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
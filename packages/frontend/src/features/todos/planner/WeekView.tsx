import { useState, useMemo, useEffect, useRef } from 'react'
import { addDays, format, isSameDay, isToday, parseISO, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils'
import { TimeAxis } from './TimeAxis'
import { HourSlot } from './HourSlot'
import { WeekDateNav } from './WeekDateNav'
import type { Todo } from '@nanomail/shared'

export interface WeekViewProps {
  /** Currently selected date */
  selectedDate: Date
  /** All todos */
  todos: Todo[]
  /** Callback when selected date changes */
  onDateChange?: (date: Date) => void
  /** Callback when a todo is clicked */
  onTodoClick?: (todo: Todo) => void
  className?: string
}

/**
 * Smart default selection logic
 * - Current week → returns today
 * - Non-current week → returns first day of the week
 */
function getSmartDefaultDate(weekStart: Date): Date {
  const today = new Date()

  // Check if today is within this week using isSameDay
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    if (isSameDay(day, today)) {
      // Return today's date
      return new Date(today.getFullYear(), today.getMonth(), today.getDate())
    }
  }

  return weekStart // Non-current week → first day
}

/**
 * WeekView - Week view with single-day display mode
 *
 * Features:
 * - Top date navigation bar (WeekDateNav)
 * - Shows 1 day content by default, click date to switch
 * - Smart default selection (current week → today, non-current week → first day)
 * - Slide animation when switching dates
 * - TimeAxis on the left side
 * - 24 HourSlots
 */
export function WeekView({
  selectedDate,
  todos,
  onDateChange,
  onTodoClick,
  className,
}: WeekViewProps): JSX.Element {
  // Calculate initial week start date
  const initialWeekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })

  // Week start date state
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart)

  // Currently displayed date (internal state)
  // Note: Initialized to selectedDate, smart default applied in useEffect
  // This ensures fake timers work correctly in tests
  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date>(selectedDate)

  // Animation direction state
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')

  // Track whether initialization has occurred (for applying smart default)
  const isInitializedRef = useRef(false)

  // Track previous prop value for change detection
  const prevSelectedDateRef = useRef<Date>(selectedDate)

  /**
   * Initialize and handle prop changes.
   *
   * Pattern explanation: We use a ref (isInitializedRef) to distinguish between
   * initial mount and subsequent updates. On initial mount, we apply the smart
   * default selection. On updates, we check if the week has changed and apply
   * smart default only when navigating to a different week.
   */
  useEffect(() => {
    const newWeekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })

    if (!isInitializedRef.current) {
      // Initial render: apply smart default
      setWeekStart(newWeekStart)
      setCurrentSelectedDate(getSmartDefaultDate(newWeekStart))
      isInitializedRef.current = true
    } else {
      // Subsequent updates: check if we switched to a different week
      const prevWeekStart = startOfWeek(prevSelectedDateRef.current, { weekStartsOn: 0 })
      const isDifferentWeek = !isSameDay(prevWeekStart, newWeekStart)

      if (isDifferentWeek) {
        // Switched to different week: apply smart default
        setWeekStart(newWeekStart)
        setCurrentSelectedDate(getSmartDefaultDate(newWeekStart))
      } else {
        // Same week date change: use the passed date directly
        setCurrentSelectedDate(selectedDate)
      }
    }

    // Update ref
    prevSelectedDateRef.current = selectedDate
  }, [selectedDate])

  // Filter todos for the selected day and group by hour
  const todosByHour = useMemo(() => {
    const grouped: Map<number, Todo[]> = new Map()
    for (let i = 0; i < 24; i++) {
      grouped.set(i, [])
    }

    todos.forEach((todo) => {
      if (todo.deadline) {
        const deadlineDate = parseISO(todo.deadline)
        if (isSameDay(deadlineDate, currentSelectedDate)) {
          const hour = deadlineDate.getHours()
          const hourTodos = grouped.get(hour) ?? []
          hourTodos.push(todo)
          grouped.set(hour, hourTodos)
        }
      }
    })

    return grouped
  }, [todos, currentSelectedDate])

  // Week navigation handler
  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newWeekStart = direction === 'prev'
      ? addDays(weekStart, -7)
      : addDays(weekStart, 7)

    setWeekStart(newWeekStart)

    // Apply smart default selection
    const defaultDate = getSmartDefaultDate(newWeekStart)
    setCurrentSelectedDate(defaultDate)

    // Set slide direction: prev week → content slides in from right, next week → from left
    setSlideDirection(direction === 'prev' ? 'right' : 'left')

    onDateChange?.(defaultDate)
  }

  // Date selection handler
  const handleDateSelect = (newDate: Date) => {
    // Set slide direction: later date → content slides in from left, earlier date → from right
    const direction = newDate > currentSelectedDate ? 'left' : 'right'
    setSlideDirection(direction)
    setCurrentSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  // Get date key (used for React key to trigger animation)
  const dateKey = format(currentSelectedDate, 'yyyy-MM-dd')

  return (
    <div data-testid="week-view" className={cn('flex flex-col h-full', className)}>
      {/* Date navigation bar */}
      <WeekDateNav
        weekStart={weekStart}
        selectedDate={currentSelectedDate}
        onDateSelect={handleDateSelect}
        onWeekChange={handleWeekChange}
        className="border-b p-2"
      />

      {/* Date title */}
      <div className="text-center py-2 border-b bg-gray-50">
        <span className="text-sm font-medium">
          {format(currentSelectedDate, 'EEE')} {format(currentSelectedDate, 'd')}
        </span>
      </div>

      {/* Main content area: TimeAxis + single day content */}
      {/* items-start prevents flex from stretching TimeAxis wrapper to viewport height */}
      <div className="flex flex-1 min-h-0 overflow-y-auto items-start">
        <div className="sticky left-0 bg-gray-50 z-10 shrink-0">
          <TimeAxis />
        </div>

        {/* Single day content area - uses React key to trigger animation */}
        <div
          key={dateKey}
          data-testid="day-content"
          data-key={dateKey}
          className={cn(
            'flex-1 relative',
            slideDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'
          )}
        >
          {Array.from({ length: 24 }).map((_, hour) => (
            <HourSlot
              key={hour}
              date={currentSelectedDate}
              hour={hour}
              todos={todosByHour.get(hour) ?? []}
              onTodoClick={onTodoClick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
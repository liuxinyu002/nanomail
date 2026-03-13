/**
 * React Query hook for fetching todos by date range
 * Calculates a 42-day calendar grid range (6 weeks) based on the given date
 */

import { useQuery } from '@tanstack/react-query'
import { startOfMonth, startOfWeek, addDays, format } from 'date-fns'
import { TodoService } from '@/services'

/**
 * Get todos for a 42-day calendar grid range
 * Calendar view displays 6 weeks = 42 days
 *
 * @param date - The reference date (typically the current month being viewed)
 * @returns React Query result with todos data
 *
 * @example
 * ```tsx
 * const [currentMonth, setCurrentMonth] = useState(new Date())
 * const { data, isLoading } = useTodosByDateRange(currentMonth)
 * ```
 */
export function useTodosByDateRange(date: Date) {
  // Calculate calendar grid range
  // Start from the first day of the month
  const monthStart = startOfMonth(date)
  // Find the Sunday that starts the calendar week containing the month start
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday start
  // The calendar ends 41 days after the start (42 days total inclusive)
  const calendarEnd = addDays(calendarStart, 41)

  // Format dates for API query
  const startDate = format(calendarStart, 'yyyy-MM-dd')
  const endDate = format(calendarEnd, 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['todos', startDate, endDate],
    queryFn: () => TodoService.getTodosByDateRange({ startDate, endDate }),
    staleTime: 1000 * 60 * 5, // 5 minutes - don't refetch within this window
  })
}
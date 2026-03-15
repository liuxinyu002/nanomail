/**
 * Date formatting utilities for email display
 *
 * Provides two formatting strategies:
 * - formatRelativeDate: For list views (e.g., "2 days ago", "just now")
 * - formatAbsoluteDate: For detail views (e.g., "14:30", "Yesterday 09:15", "Mar 15")
 */

import { format, isSameDay, subDays, isThisYear } from 'date-fns'

/**
 * Format a date relative to now
 *
 * Used for email list views where quick relative context is helpful.
 *
 * Examples:
 * - "just now"
 * - "5 minutes ago"
 * - "1 hour ago"
 * - "yesterday"
 * - "3 days ago"
 * - "1/15/2024" (older than a week)
 *
 * @param date - The date to format
 * @returns Formatted relative date string
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMinutes === 0) {
        return 'just now'
      }
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    }
    if (diffHours === 1) {
      return '1 hour ago'
    }
    return `${diffHours} hours ago`
  }
  if (diffDays === 1) {
    return 'yesterday'
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`
  }
  return date.toLocaleDateString()
}

/**
 * Format a date with absolute precision
 *
 * Used for email detail views where exact timing is more useful.
 *
 * Examples:
 * - "14:30" (today)
 * - "Yesterday 09:15"
 * - "Mar 15" (this year)
 * - "Nov 2, 2023" (cross-year)
 *
 * @param dateString - ISO date string to format
 * @returns Formatted absolute date string
 */
export function formatAbsoluteDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()

  // Today: show specific time
  if (isSameDay(date, now)) {
    return format(date, 'HH:mm')
  }

  // Yesterday
  if (isSameDay(date, subDays(now, 1))) {
    return `Yesterday ${format(date, 'HH:mm')}`
  }

  // This year: "Mar 15"
  if (isThisYear(date)) {
    return format(date, 'MMM d')
  }

  // Cross-year: "Nov 2, 2023"
  return format(date, 'MMM d, yyyy')
}
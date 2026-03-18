/**
 * Board Column Colors - Single Source of Truth
 *
 * This file defines the canonical color values for board columns.
 * Both Hex values (for inline styles/database) and Tailwind classes (for CSS) are provided.
 *
 * Usage:
 * - For inline styles: style={{ backgroundColor: BOARD_COLUMN_COLORS.inbox.hex }}
 * - For Tailwind classes: className={BOARD_COLUMN_COLORS.inbox.tailwind}
 */

export const BOARD_COLUMN_COLORS = {
  inbox: {
    id: 1,
    name: 'Inbox',
    hex: '#6B7280',
    tailwind: 'bg-gray-500',
  },
  todo: {
    id: 2,
    name: 'Todo',
    hex: '#3B82F6',
    tailwind: 'bg-blue-500',
  },
  inProgress: {
    id: 3,
    name: 'In Progress',
    hex: '#F59E0B',
    tailwind: 'bg-amber-500',
  },
  done: {
    id: 4,
    name: 'Done',
    hex: '#10B981',
    tailwind: 'bg-green-500',
  },
} as const

/**
 * Get color info by column ID
 */
export function getColumnColorById(columnId: number): { hex: string; tailwind: string } | undefined {
  const colors = Object.values(BOARD_COLUMN_COLORS)
  const color = colors.find(c => c.id === columnId)
  return color ? { hex: color.hex, tailwind: color.tailwind } : undefined
}

/**
 * Map column ID to Tailwind class for calendar display
 * Used by CalendarDayCell to show priority indicator
 */
export const COLUMN_ID_TO_TAILWIND: Record<number, string> = {
  1: BOARD_COLUMN_COLORS.inbox.tailwind,
  2: BOARD_COLUMN_COLORS.todo.tailwind,
  3: BOARD_COLUMN_COLORS.inProgress.tailwind,
  4: BOARD_COLUMN_COLORS.done.tailwind,
}

/**
 * Macaron/Pastel color palette for UI elements
 * Lower saturation for softer, modern appearance
 * Used by ColorPicker component and status indicators
 */
export const MACARON_COLORS = [
  '#FFB5BA', // Pastel Red
  '#FFD8A8', // Pastel Orange
  '#FFF4B8', // Pastel Yellow
  '#B8E6C1', // Pastel Green
  '#B8D4FF', // Pastel Blue
  '#D4B8FF', // Pastel Purple
] as const

export type MacaronColor = (typeof MACARON_COLORS)[number]

/**
 * Macaron color options with accessible names
 * Derived from MACARON_COLORS for use in ColorPicker
 */
export const MACARON_COLOR_OPTIONS = [
  { name: 'Pastel Red', hex: '#FFB5BA' },
  { name: 'Pastel Orange', hex: '#FFD8A8' },
  { name: 'Pastel Yellow', hex: '#FFF4B8' },
  { name: 'Pastel Green', hex: '#B8E6C1' },
  { name: 'Pastel Blue', hex: '#B8D4FF' },
  { name: 'Pastel Purple', hex: '#D4B8FF' },
] as const

export type MacaronColorOption = (typeof MACARON_COLOR_OPTIONS)[number]

/**
 * Brand colors (from SPEC)
 * Used for primary actions, text, and backgrounds
 */
export const BRAND_COLORS = {
  vibrantBlue: '#2563EB',  // Primary action color
  textPrimary: '#111827',  // Main text
  textSecondary: '#6B7280', // Secondary text
  background: '#F7F8FA',   // Column background
} as const
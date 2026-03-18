import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DroppableZoneProps {
  /** Unique identifier for this droppable zone */
  id: string | number
  /** Type of zone - determines how dropped items are processed */
  type: 'inbox' | 'planner' | 'board'
  /** Column ID for board-type zones */
  columnId?: number
  /** Date for planner-type zones (YYYY-MM-DD format) */
  date?: string
  /** Hour for planner-type zones (0-23) */
  hour?: number
  /** Child content to render inside the zone */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Validates that an hour value is a valid integer between 0 and 23.
 * @param hour - The hour value to validate
 * @returns The valid hour number, or undefined if invalid
 */
function validateHour(hour: number | undefined): number | undefined {
  if (hour === undefined) return undefined
  if (!Number.isInteger(hour)) return undefined
  if (hour < 0 || hour > 23) return undefined
  return hour
}

/**
 * A generic droppable zone component.
 * Provides visual feedback when a draggable item hovers over it.
 *
 * @example
 * // Board column zone
 * <DroppableZone id="column-1" type="board" columnId={1}>
 *   <TodoColumn />
 * </DroppableZone>
 *
 * @example
 * // Planner hour slot zone
 * <DroppableZone id="planner-2024-12-25-14" type="planner" date="2024-12-25" hour={14}>
 *   <HourSlot />
 * </DroppableZone>
 *
 * @example
 * // Inbox zone
 * <DroppableZone id="inbox" type="inbox">
 *   <InboxList />
 * </DroppableZone>
 */
export function DroppableZone({
  id,
  type,
  columnId,
  date,
  hour,
  children,
  className,
}: DroppableZoneProps) {
  // Validate hour prop - only allow integers 0-23
  const validatedHour = validateHour(hour)

  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type,
      columnId,
      date,
      hour: validatedHour,
    },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid="droppable-zone"
      className={cn(
        'transition-colors duration-200',
        isOver && 'bg-blue-50 ring-2 ring-blue-300',
        className
      )}
    >
      {children}
    </div>
  )
}
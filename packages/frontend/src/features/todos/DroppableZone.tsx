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
  /** Date for planner-type zones */
  date?: string
  /** Child content to render inside the zone */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
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
 * // Planner date zone
 * <DroppableZone id="date-2024-12-25" type="planner" date="2024-12-25">
 *   <CalendarDay />
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
  children,
  className,
}: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type,
      columnId,
      date,
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
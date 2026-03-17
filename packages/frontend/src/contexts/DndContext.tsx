import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  DndContext as DndKitContext,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'

/**
 * Data associated with a draggable item
 */
export interface DragData {
  type: 'todo' | 'other'
  todo?: {
    id: number
    boardColumnId: number
    position?: number
  }
  [key: string]: unknown
}

/**
 * Active item being dragged
 */
export interface ActiveItem {
  id: UniqueIdentifier
  data: DragData
}

/**
 * Zone being hovered over during drag
 */
export interface OverZone {
  id: UniqueIdentifier
  type: 'inbox' | 'planner' | 'board'
  columnId?: number
  date?: string
}

/**
 * Context value provided by DndProvider
 */
interface DndContextValue {
  /** Whether an item is currently being dragged */
  isDragging: boolean
  /** The item currently being dragged */
  activeItem: ActiveItem | null
  /** The zone currently being hovered over */
  overZone: OverZone | null
}

const DndContext = createContext<DndContextValue | null>(null)

/**
 * Hook to access DnD context values.
 * Must be used within a DndProvider.
 */
export function useDndContext(): DndContextValue {
  const context = useContext(DndContext)
  if (!context) {
    throw new Error('useDndContext must be used within a DndProvider')
  }
  return context
}

export interface DndProviderProps {
  children: ReactNode
  /** Callback fired when a drag operation ends */
  onDragEnd?: (event: DragEndEvent) => void
  /** Callback fired when a drag operation starts */
  onDragStart?: (event: DragStartEvent) => void
  /** Callback fired when dragging over a droppable zone */
  onDragOver?: (event: DragOverEvent) => void
}

/**
 * Provider component that wraps dnd-kit's DndContext.
 * Provides drag state to child components via context.
 */
export function DndProvider({
  children,
  onDragEnd,
  onDragStart,
  onDragOver,
}: DndProviderProps) {
  // Track drag state
  const [isDragging, setIsDragging] = useState(false)
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null)
  const [overZone, setOverZone] = useState<OverZone | null>(null)

  // Configure sensors for pointer and keyboard input
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setIsDragging(true)
      setActiveItem({
        id: event.active.id,
        data: event.active.data.current as DragData,
      })
      setOverZone(null)
      onDragStart?.(event)
    },
    [onDragStart]
  )

  // Handle drag over
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (event.over) {
        setOverZone({
          id: event.over.id,
          type: event.over.data.current?.type ?? 'board',
          columnId: event.over.data.current?.columnId,
          date: event.over.data.current?.date,
        })
      } else {
        setOverZone(null)
      }
      onDragOver?.(event)
    },
    [onDragOver]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false)
      setActiveItem(null)
      setOverZone(null)
      onDragEnd?.(event)
    },
    [onDragEnd]
  )

  // Context value
  const contextValue: DndContextValue = {
    isDragging,
    activeItem,
    overZone,
  }

  return (
    <DndKitContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <DndContext.Provider value={contextValue}>{children}</DndContext.Provider>
    </DndKitContext>
  )
}

// Re-export types from dnd-kit for convenience
export type { DragEndEvent, DragStartEvent, DragOverEvent }
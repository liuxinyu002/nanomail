import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useTodos, useBoardColumns, useUpdateTodoMutation, useCreateBoardColumnMutation, useDeleteBoardColumnMutation, useUpdateBoardColumnMutation } from '@/hooks'
import { toast } from 'sonner'
import { DndProvider } from '@/contexts/DndContext'
import {
  ViewToggle,
  InboxPanel,
  PlannerPanel,
  BoardPanel,
  ResizablePanels,
  DEFAULT_PANEL_CONFIGS,
  ArchiveDialog,
  type ViewType,
} from '@/features/todos'
import type { BoardColumn } from '@nanomail/shared'
import type { DragEndEvent } from '@/contexts/DndContext'

/**
 * Validates that an hour value is a valid integer between 0 and 23.
 * @param hour - The hour value to validate
 * @returns true if valid, false otherwise
 */
function isValidHour(hour: number | undefined): hour is number {
  if (hour === undefined) return false
  if (!Number.isInteger(hour)) return false
  if (hour < 0 || hour > 23) return false
  return true
}

const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: 1, name: 'Inbox', color: '#C9CDD4', order: 0, isSystem: true, createdAt: new Date() },
  { id: 2, name: 'Todo', color: '#3B82F6', order: 1, isSystem: false, createdAt: new Date() },
  { id: 3, name: 'In Progress', color: '#F59E0B', order: 2, isSystem: false, createdAt: new Date() },
  { id: 4, name: 'Done', color: '#10B981', order: 3, isSystem: false, createdAt: new Date() },
]

export function TodosPage() {
  const [activeViews, setActiveViews] = useState<ViewType[]>(['inbox', 'board'])
  // Archive dialog state
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  // Highlighted todo ID for restore animation
  const [highlightedTodoId, setHighlightedTodoId] = useState<number | null>(null)

  const { data, isLoading, error } = useTodos()
  const { data: columnsData, error: columnsError } = useBoardColumns()
  const todos = data?.todos ?? []
  const columns = columnsData ?? DEFAULT_COLUMNS

  // Mutation hook for updating todos (includes optimistic update)
  const updateTodoMutation = useUpdateTodoMutation()

  // Mutation hook for creating board columns
  const createColumnMutation = useCreateBoardColumnMutation()

  // Mutation hook for deleting board columns
  const deleteColumnMutation = useDeleteBoardColumnMutation()

  // Mutation hook for updating board columns (color, name, etc.)
  const updateColumnMutation = useUpdateBoardColumnMutation()

  useEffect(() => {
    if (error) {
      toast.error('Failed to load todos')
    }
  }, [error])

  useEffect(() => {
    if (columnsError) {
      toast.error('Failed to load board columns')
    }
  }, [columnsError])

  // Auto-clear highlighted todo after 2 seconds (cleanup on unmount or value change)
  useEffect(() => {
    if (highlightedTodoId === null) return

    const timer = setTimeout(() => {
      setHighlightedTodoId(null)
    }, 2000)

    return () => clearTimeout(timer)
  }, [highlightedTodoId])

  /**
   * Handle drag end events from dnd-kit
   *
   * Drag behavior matrix:
   * - To Inbox: Set boardColumnId = 1, clear deadline
   * - To Board Column: Set boardColumnId + optional position
   * - To Planner Hour Slot: Set deadline (from date + hour) + boardColumnId = 2
   * - To Planner (no hour): Set deadline (date-only)
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // No drop target - drag cancelled
    if (!event.over) return

    // Extract source todo info
    const activeData = event.active.data.current
    if (!activeData || activeData.type !== 'todo' || !activeData.todo) return

    const todo = activeData.todo
    const todoId = todo.id
    const sourceColumnId = todo.boardColumnId

    // Extract target zone info
    const overData = event.over.data.current
    if (!overData) return

    const targetZoneType = overData.type as 'inbox' | 'planner' | 'board'
    const targetColumnId = overData.columnId as number | undefined
    const targetDate = overData.date as string | undefined
    const targetHour = overData.hour as number | undefined

    // Prepare update payload
    const updatePayload: { boardColumnId?: number; deadline?: string | null } = {}

    switch (targetZoneType) {
      case 'inbox':
        // Dropping to Inbox: set boardColumnId = 1
        if (sourceColumnId === 1) return
        updatePayload.boardColumnId = 1
        break

      case 'board':
        // Dropping to Board column: set boardColumnId
        if (!targetColumnId) return
        if (sourceColumnId === targetColumnId) return
        updatePayload.boardColumnId = targetColumnId
        break

      case 'planner':
        // Dropping to Planner hour slot: set deadline AND boardColumnId = 2
        if (!targetDate) return

        // Create ISO datetime from date + hour (if hour is specified and valid)
        const targetDateTime = new Date(targetDate)
        if (isValidHour(targetHour)) {
          // Hour-specific drop: set precise time (validated 0-23 integer)
          targetDateTime.setHours(targetHour, 0, 0, 0)
        }
        updatePayload.deadline = targetDateTime.toISOString()
        updatePayload.boardColumnId = 2 // Move to Todo column
        break

      default:
        return
    }

    // Execute mutation with optimistic update
    updateTodoMutation.mutate(
      { id: todoId, data: updatePayload },
      {
        onSuccess: () => toast.success('Task moved successfully'),
        onError: () => toast.error('Failed to move task'),
      }
    )
  }, [updateTodoMutation])

  /**
   * Handle creating a new board column
   */
  const handleCreateColumn = useCallback((name: string, order: number) => {
    createColumnMutation.mutate(
      { name, order, color: null },
      {
        onSuccess: () => toast.success('Column created successfully'),
        onError: () => toast.error('Failed to create column'),
      }
    )
  }, [createColumnMutation])

  /**
   * Handle deleting a board column
   */
  const handleDeleteColumn = useCallback((columnId: number) => {
    deleteColumnMutation.mutate(columnId, {
      onSuccess: (data) => {
        if (data.movedTasks > 0) {
          toast.success(`${data.movedTasks} task${data.movedTasks === 1 ? '' : 's'} moved to Inbox`)
        } else {
          toast.success('Column deleted successfully')
        }
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to delete column')
      },
    })
  }, [deleteColumnMutation])

  /**
   * Handle updating a board column (color, name, etc.)
   */
  const handleUpdateColumn = useCallback((columnId: number, data: { name?: string; color?: string | null }) => {
    updateColumnMutation.mutate(
      { id: columnId, data },
      {
        onSuccess: () => toast.success('Column updated successfully'),
        onError: () => toast.error('Failed to update column'),
      }
    )
  }, [updateColumnMutation])

  const handleViewToggle = (view: ViewType) => {
    setActiveViews(prev => {
      const isActive = prev.includes(view)
      if (isActive) {
        if (prev.length === 1) {
          return prev
        }
        return prev.filter(v => v !== view)
      } else {
        return [...prev, view]
      }
    })
  }

  /**
   * Handle opening archive dialog
   */
  const handleViewArchive = useCallback(() => {
    setIsArchiveDialogOpen(true)
  }, [])

  /**
   * Handle todo restoration - set highlight (auto-clear handled by useEffect)
   */
  const handleRestore = useCallback((todoId: number) => {
    setHighlightedTodoId(todoId)
  }, [])

  const showInbox = activeViews.includes('inbox')
  const showPlanner = activeViews.includes('planner')
  const showBoard = activeViews.includes('board')

  // Filter panel configs based on active views
  // minSize: Pixel values ensure absolute minimum widths per plan_2_phase_2.md
  // defaultSize: Percentage strings for proportional layout
  const panelConfigs = useMemo(
    () => DEFAULT_PANEL_CONFIGS.filter(config => {
      if (config.id === 'inbox') return showInbox
      if (config.id === 'planner') return showPlanner
      if (config.id === 'board') return showBoard
      return false
    }),
    [showInbox, showPlanner, showBoard]
  )

  // Compute panel children based on active views
  const panelChildren = useMemo(() => {
    const children: React.ReactNode[] = []
    if (showInbox) {
      children.push(
        <InboxPanel
          key="inbox"
          className="h-full"
          todos={todos}
          onViewArchive={handleViewArchive}
          highlightedTodoId={highlightedTodoId}
        />
      )
    }
    if (showPlanner) {
      children.push(
        <PlannerPanel
          key="planner"
          className="h-full"
          todos={todos}
        />
      )
    }
    if (showBoard) {
      children.push(
        <BoardPanel
          key="board"
          className="h-full"
          columns={columns}
          todos={todos}
          onCreateColumn={handleCreateColumn}
          onDeleteColumn={handleDeleteColumn}
          onUpdateColumn={handleUpdateColumn}
        />
      )
    }
    return children
  }, [showInbox, showPlanner, showBoard, todos, columns, handleViewArchive, highlightedTodoId, handleCreateColumn, handleDeleteColumn, handleUpdateColumn])

  if (isLoading) {
    return (
      <div className="p-6">
        <div
          className="flex items-center justify-center py-12"
          data-testid="loading-todos"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6">
      <DndProvider onDragEnd={handleDragEnd}>
        <div
          data-testid="panels-container"
          className="flex-1 min-h-0 overflow-hidden"
        >
          <ResizablePanels
            panelConfigs={panelConfigs}
            className="h-full"
          >
            {panelChildren}
          </ResizablePanels>
        </div>

        <ViewToggle
          activeViews={activeViews}
          onToggle={handleViewToggle}
        />
      </DndProvider>

      {/* Archive Dialog */}
      <ArchiveDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        onRestore={handleRestore}
      />
    </div>
  )
}

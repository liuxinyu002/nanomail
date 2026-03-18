import { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckSquare, Loader2 } from 'lucide-react'
import { useTodos, useBoardColumns, useUpdateTodoMutation, useCreateBoardColumnMutation, useDeleteBoardColumnMutation, useUpdateBoardColumnMutation } from '@/hooks'
import { toast } from 'sonner'
import { DndProvider } from '@/contexts/DndContext'
import { ViewToggle, type ViewType } from '@/features/todos/ViewToggle'
import { InboxPanel } from '@/features/todos/InboxPanel'
import { PlannerPanel } from '@/features/todos/PlannerPanel'
import { BoardPanel } from '@/features/todos/BoardPanel'
import { ResizablePanels, type PanelConfig } from '@/features/todos/ResizablePanels'
import type { BoardColumn } from '@nanomail/shared'
import type { DragEndEvent } from '@/contexts/DndContext'

const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: 1, name: 'Inbox', color: '#6B7280', order: 0, isSystem: true, createdAt: new Date() },
  { id: 2, name: 'Todo', color: '#3B82F6', order: 1, isSystem: false, createdAt: new Date() },
  { id: 3, name: 'In Progress', color: '#F59E0B', order: 2, isSystem: false, createdAt: new Date() },
  { id: 4, name: 'Done', color: '#10B981', order: 3, isSystem: false, createdAt: new Date() },
]

export function TodosPage() {
  const [activeViews, setActiveViews] = useState<ViewType[]>(['inbox', 'board'])

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

  /**
   * Handle drag end events from dnd-kit
   *
   * Drag behavior matrix:
   * - To Inbox: Set boardColumnId = 1
   * - To Board Column: Set boardColumnId + optional position
   * - To Planner: Set deadline (preserve boardColumnId for Board items - visual snapback)
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
        // Dropping to Planner: set deadline
        // Note: For Board items, this creates visual snapback (stays in Board with new deadline)
        if (!targetDate) return
        // Convert date string (yyyy-MM-dd) to ISO datetime format
        updatePayload.deadline = new Date(targetDate).toISOString()
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

  const showInbox = activeViews.includes('inbox')
  const showPlanner = activeViews.includes('planner')
  const showBoard = activeViews.includes('board')

  // Compute panel configs based on active views
  // minSize: Pixel values ensure absolute minimum widths per plan_2_phase_2.md
  // defaultSize: Percentage strings for proportional layout
  const panelConfigs = useMemo((): PanelConfig[] => {
    const configs: PanelConfig[] = []
    if (showInbox) configs.push({ id: 'inbox', defaultSize: '25%', minSize: 280 })
    if (showPlanner) configs.push({ id: 'planner', defaultSize: '35%', minSize: 320 })
    if (showBoard) configs.push({ id: 'board', defaultSize: '40%', minSize: 280 })
    return configs
  }, [showInbox, showPlanner, showBoard])

  // Compute panel children based on active views
  const panelChildren = useMemo(() => {
    const children: React.ReactNode[] = []
    if (showInbox) {
      children.push(
        <InboxPanel
          key="inbox"
          className="h-full"
          todos={todos}
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
  }, [showInbox, showPlanner, showBoard, todos, columns])

  const isEmpty = todos.length === 0

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
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Action Items</h2>
            <p className="text-muted-foreground max-w-md">
              Action items extracted from your emails will be displayed here.
              Process some emails to see your to-dos.
            </p>
          </div>
        ) : (
          <div
            data-testid="panels-container"
            className="flex-1 overflow-hidden"
          >
            <ResizablePanels
              panelConfigs={panelConfigs}
              className="h-full"
            >
              {panelChildren}
            </ResizablePanels>
          </div>
        )}

        <ViewToggle
          activeViews={activeViews}
          onToggle={handleViewToggle}
        />
      </DndProvider>
    </div>
  )
}

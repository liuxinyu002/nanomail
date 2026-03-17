import { useState, useEffect } from 'react'
import { CheckSquare, Loader2 } from 'lucide-react'
import { useTodos, useBoardColumns } from '@/hooks'
import { toast } from 'sonner'
import { DndProvider } from '@/contexts/DndContext'
import { ViewToggle, type ViewType } from '@/features/todos/ViewToggle'
import { InboxPanel } from '@/features/todos/InboxPanel'
import { PlannerPanel } from '@/features/todos/PlannerPanel'
import { BoardPanel } from '@/features/todos/BoardPanel'
import type { BoardColumn } from '@nanomail/shared'
import type { DragEndEvent } from '@/contexts/DndContext'

const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: 1, name: 'Inbox', color: '#6B7280', order: 0, isSystem: true, createdAt: new Date() },
  { id: 2, name: 'Todo', color: '#3B82F6', order: 1, isSystem: false, createdAt: new Date() },
  { id: 3, name: 'In Progress', color: '#F59E0B', order: 2, isSystem: false, createdAt: new Date() },
  { id: 4, name: 'Done', color: '#10B981', order: 3, isSystem: false, createdAt: new Date() },
]

export function TodosPage() {
  const [activeViews, setActiveViews] = useState<ViewType[]>(['inbox', 'planner', 'board'])

  const { data, isLoading, error } = useTodos()
  const { data: columnsData, error: columnsError } = useBoardColumns()
  const todos = data?.todos ?? []
  const columns = columnsData ?? DEFAULT_COLUMNS

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

  // Debug: Log when drag ends - IMPORTANT: This is currently MISSING!
  // The DndProvider requires onDragEnd callback to process the drop
  const handleDragEnd = (event: DragEndEvent) => {
    console.log('[DnD Debug] TodosPage - handleDragEnd called:', {
      activeId: event.active.id,
      activeData: event.active.data.current,
      overId: event.over?.id,
      overData: event.over?.data.current,
    })

    // TODO: Implement actual drag handling logic here
    // - Extract todo id from event.active.data.current
    // - Extract target zone info from event.over.data.current
    // - Call mutation to update boardColumnId/position/deadline
    if (!event.over) {
      console.log('[DnD Debug] TodosPage - No drop target, drag cancelled')
      return
    }

    console.log('[DnD Debug] TodosPage - Drop successful, but NO mutation logic implemented yet!')
  }

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

  const isEmpty = todos.length === 0

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">To-Do</h1>
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
    <div className="flex flex-col h-full p-6 pb-20">
      <h1 className="text-2xl font-bold mb-4">To-Do</h1>

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
            className="flex-1 flex gap-4 overflow-hidden"
          >
            {showInbox && (
              <InboxPanel
                className="flex-1 min-w-0"
                todos={todos}
              />
            )}
            {showPlanner && (
              <PlannerPanel
                className="flex-1 min-w-0"
                todos={todos}
              />
            )}
            {showBoard && (
              <BoardPanel
                className="flex-1 min-w-0"
                columns={columns}
                todos={todos}
              />
            )}
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

/**
 * ArchiveDialog - Dialog for viewing and restoring archived (completed) todos
 *
 * Features:
 * - Lazy loading: only fetches data when opened
 * - Infinite scroll with cursor-based pagination
 * - Restore functionality: move completed todos back to Inbox
 * - Readonly card display with completedAt timestamp
 */

import { useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Archive, Loader2, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useArchivedTodos, useRestoreTodoMutation, flattenArchivedTodos } from '@/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Todo } from '@nanomail/shared'

interface ArchiveDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when a todo is restored, receives the restored todo ID */
  onRestore?: (todoId: number) => void
}

/**
 * Format completedAt date for display
 */
function formatCompletedAt(dateString: string | null): string {
  if (!dateString) return '未知时间'
  try {
    return format(new Date(dateString), 'yyyy年M月d日 HH:mm', { locale: zhCN })
  } catch {
    return '未知时间'
  }
}

/**
 * ArchiveTodoCard - Readonly card for displaying archived todos
 */
function ArchiveTodoCard({
  todo,
  onRestore,
  isRestoring,
}: {
  todo: Todo
  onRestore: () => void
  isRestoring: boolean
}) {
  return (
    <div
      data-testid="archive-todo-card"
      className={cn(
        'bg-white rounded-md',
        'border border-gray-100',
        'p-4 mb-2',
        'transition-opacity',
        isRestoring && 'opacity-50'
      )}
    >
      {/* Header with description and completed badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm text-gray-900 line-through flex-1">
          {todo.description}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded shrink-0">
          已完成
        </span>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <Archive className="w-3 h-3" />
          {formatCompletedAt(todo.completedAt)}
        </span>
      </div>

      {/* Restore button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRestore}
        disabled={isRestoring}
        className="w-full"
        data-testid="restore-button"
      >
        {isRestoring ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            恢复中...
          </>
        ) : (
          <>
            <RotateCcw className="w-3 h-3 mr-1" />
            恢复到 Inbox
          </>
        )}
      </Button>
    </div>
  )
}

/**
 * Empty state for archive dialog
 */
function ArchiveEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Archive className="h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-sm font-medium text-gray-500 mb-1">没有归档的卡片</h3>
      <p className="text-xs text-gray-400">
        完成的任务会显示在这里
      </p>
    </div>
  )
}

export function ArchiveDialog({ open, onOpenChange, onRestore }: ArchiveDialogProps) {
  // Infinite query for archived todos (only enabled when dialog is open)
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useArchivedTodos({ enabled: open, limit: 20 })

  // Restore mutation
  const restoreMutation = useRestoreTodoMutation()

  // Flatten pages into single array
  const archivedTodos = flattenArchivedTodos(data?.pages)

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Handle restore
  const handleRestore = useCallback((todo: Todo) => {
    restoreMutation.mutate(todo.id, {
      onSuccess: () => {
        toast.success('任务已恢复到 Inbox')
        onRestore?.(todo.id)
      },
      onError: () => {
        toast.error('恢复失败，请重试')
      },
    })
  }, [restoreMutation, onRestore])

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!open || !hasNextPage || !loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="archive-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            归档的卡片
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto max-h-[60vh] -mx-6 px-6">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-red-500 mb-2">加载失败</p>
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
                重试
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && archivedTodos.length === 0 && (
            <ArchiveEmptyState />
          )}

          {/* Todo list */}
          {!isLoading && !error && archivedTodos.length > 0 && (
            <div className="py-2">
              {archivedTodos.map((todo) => (
                <ArchiveTodoCard
                  key={todo.id}
                  todo={todo}
                  onRestore={() => handleRestore(todo)}
                  isRestoring={restoreMutation.isPending && restoreMutation.variables === todo.id}
                />
              ))}

              {/* Load more trigger / indicator */}
              <div ref={loadMoreRef} className="py-4">
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                )}
                {!hasNextPage && archivedTodos.length > 0 && (
                  <p className="text-xs text-center text-gray-400">
                    已显示全部 {archivedTodos.length} 条归档
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

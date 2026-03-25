/**
 * React Query hook for fetching archived (completed) todos with infinite scroll
 *
 * Used by the archive dialog to display completed todos.
 * Implements cursor-based pagination for efficient loading.
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { TodoService } from '@/services'
import type { ArchivedTodosResponse } from '@nanomail/shared'

interface UseArchivedTodosOptions {
  /** Number of items per page (default: 20, max: 100) */
  limit?: number
  /** Whether to enable the query (default: false for lazy loading) */
  enabled?: boolean
}

/**
 * Hook for fetching archived todos with infinite scroll support
 *
 * @example
 * ```tsx
 * const { todos, fetchNextPage, hasNextPage, isLoading } = useArchivedTodos({ enabled: isDialogOpen })
 *
 * // Infinite scroll
 * <div ref={lastItemRef}>
 *   {todos.map(todo => <TodoCard key={todo.id} todo={todo} />)}
 * </div>
 * ```
 */
export function useArchivedTodos(options: UseArchivedTodosOptions = {}) {
  const { limit = 20, enabled = false } = options

  return useInfiniteQuery({
    queryKey: ['todos', 'archive', { limit }],
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      TodoService.getArchivedTodos({
        limit,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage: ArchivedTodosResponse) => {
      if (!lastPage.hasMore || !lastPage.nextCursor) {
        return undefined
      }
      return lastPage.nextCursor
    },
    enabled,
  })
}

/**
 * Flattens paginated data into a single array of todos
 * Use this helper to render the list from infinite query data
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useArchivedTodos({ enabled: true })
 * const todos = flattenArchivedTodos(data)
 * ```
 */
export function flattenArchivedTodos(
  data: ArchivedTodosResponse[] | undefined
): ArchivedTodosResponse['todos'] {
  if (!data) return []
  return data.flatMap((page) => page.todos)
}

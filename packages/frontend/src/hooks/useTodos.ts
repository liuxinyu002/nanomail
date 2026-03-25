/**
 * React Query hook for fetching active (non-completed) todos
 *
 * Used by TodosPage for the list view.
 * By default, excludes completed todos (archive) from the result.
 * Mutation hooks (useUpdateTodoMutation, useDeleteTodoMutation) will automatically
 * update the cache when changes occur.
 */

import { useQuery } from '@tanstack/react-query'
import { TodoService } from '@/services'
import type { TodosQuery } from '@/services'

export interface UseTodosOptions {
  /** Additional query filters */
  filters?: Omit<TodosQuery, 'excludeStatus'>
}

/**
 * Hook for fetching active todos (excludes completed by default)
 *
 * @example
 * ```tsx
 * // Get all active todos
 * const { data, isLoading } = useTodos()
 *
 * // Get active todos in specific column
 * const { data } = useTodos({ filters: { boardColumnId: 2 } })
 * ```
 */
export function useTodos(options: UseTodosOptions = {}) {
  const { filters } = options

  return useQuery({
    queryKey: ['todos', 'list', filters],
    queryFn: () => TodoService.getTodos({
      ...filters,
      excludeStatus: 'completed', // Always exclude completed (archive) from main view
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
/**
 * React Query mutation hooks for Todo position operations with optimistic updates
 *
 * Provides optimistic UI updates for:
 * - Updating todo position (immediate cache update with rollback on error)
 * - Batch updating positions (for rebalancing after drag-and-drop)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TodoService } from '@/services'
import type { TodoItem } from '@/services'
import type { UpdateTodoPosition } from '@nanomail/shared'

/**
 * Context for tracking previous state during optimistic updates
 * Uses a Map to store previous data for ALL cached queries, not just the first one.
 * This ensures complete rollback when multiple queries exist (e.g., different columns).
 */
interface MutationContext {
  previousData: Map<string, { todos: TodoItem[] }>
}

/**
 * Hook for updating a todo position with optimistic updates
 *
 * Optimistic update pattern:
 * 1. Cancel ongoing queries
 * 2. Save previous state for rollback
 * 3. Immediately update cache
 * 4. If error, rollback to previous state
 * 5. Invalidate queries to ensure sync with server
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateTodoPositionMutation()
 *
 * // Move todo to column 2 - UI updates immediately
 * const handleDrop = (todoId: number, targetColumnId: number, position: number) => {
 *   updateMutation.mutate({
 *     id: todoId,
 *     data: { boardColumnId: targetColumnId, position }
 *   })
 * }
 * ```
 */
export function useUpdateTodoPositionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTodoPosition }) =>
      TodoService.updateTodoPosition(id, data),

    // Optimistic update: immediately modify cache
    onMutate: async ({ id, data }): Promise<MutationContext> => {
      // 1. Find all todo queries
      const queryCache = queryClient.getQueryCache()
      const todoQueries = queryCache.findAll({ queryKey: ['todos'] })

      // 2. Cancel ongoing queries to prevent overwriting optimistic update
      await Promise.all(todoQueries.map((query) => query.cancel()))

      // 3. Save previous data for ALL queries (not just the first one)
      const previousData = new Map<string, { todos: TodoItem[] }>()
      todoQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey)
        const queryData = query.state.data as { todos: TodoItem[] } | undefined
        if (queryData) {
          previousData.set(key, queryData)
        }
      })

      // 4. Optimistically update all matching queries
      todoQueries.forEach((query) => {
        queryClient.setQueryData(
          query.queryKey,
          (old: { todos: TodoItem[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              todos: old.todos.map((todo) =>
                todo.id === id ? { ...todo, ...data } : todo
              ),
            }
          }
        )
      })

      return { previousData }
    },

    // Rollback on error - restore ALL queries
    onError: (_err, _variables, context) => {
      context?.previousData.forEach((data, key) => {
        const queryKey = JSON.parse(key)
        queryClient.setQueryData(queryKey, data)
      })
    },

    // Invalidate queries after mutation completes (success or error)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

/**
 * Hook for batch updating todo positions
 *
 * Used for rebalancing positions after drag-and-drop operations
 * when multiple todos need their positions updated at once.
 *
 * @example
 * ```tsx
 * const batchMutation = useBatchUpdatePositionsMutation()
 *
 * // Rebalance positions after drag
 * const handleRebalance = (updates: Array<{id, boardColumnId, position}>) => {
 *   batchMutation.mutate(updates)
 * }
 * ```
 */
export function useBatchUpdatePositionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Array<{ id: number; boardColumnId: number; position: number }>) =>
      TodoService.batchUpdatePositions(updates),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
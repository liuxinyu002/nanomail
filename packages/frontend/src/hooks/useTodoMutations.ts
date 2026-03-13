/**
 * React Query mutation hooks for Todo operations with optimistic updates
 *
 * Provides optimistic UI updates for:
 * - Updating todos (immediate cache update with rollback on error)
 * - Deleting todos (immediate removal with rollback on error)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TodoService } from '@/services'
import type { TodoItem, UpdateTodo } from '@/services'

/**
 * Context for tracking previous state during optimistic updates
 * Uses a Map to store previous data for ALL cached queries, not just the first one.
 * This ensures complete rollback when multiple queries exist (e.g., different date ranges).
 */
interface MutationContext {
  previousData: Map<string, { todos: TodoItem[] }>
}

/**
 * Hook for updating a todo with optimistic updates
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateTodoMutation()
 *
 * // Update deadline - UI updates immediately
 * const handleDeadlineChange = (newDeadline: Date) => {
 *   updateMutation.mutate({
 *     id: todo.id,
 *     data: { deadline: newDeadline.toISOString() }
 *   })
 * }
 * ```
 */
export function useUpdateTodoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTodo }) =>
      TodoService.updateTodo(id, data),

    // Optimistic update: immediately modify cache
    onMutate: async ({ id, data }): Promise<MutationContext> => {
      // 1. Find all todo queries
      const queryCache = queryClient.getQueryCache()
      const todoQueries = queryCache.findAll({ queryKey: ['todos'] })

      // 2. Cancel ongoing queries to prevent overwriting optimistic update
      await Promise.all(
        todoQueries.map((query) => query.cancel())
      )

      // 3. Save previous data for ALL queries (not just the first one)
      const previousData = new Map<string, { todos: TodoItem[] }>()
      todoQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey)
        const data = query.state.data as { todos: TodoItem[] } | undefined
        if (data) {
          previousData.set(key, data)
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
 * Hook for deleting a todo with optimistic updates
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteTodoMutation()
 *
 * // Delete todo - UI updates immediately
 * const handleDelete = () => {
 *   deleteMutation.mutate(todo.id)
 * }
 * ```
 */
export function useDeleteTodoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => TodoService.deleteTodo(id),

    // Optimistic delete: immediately remove from cache
    onMutate: async (id): Promise<MutationContext> => {
      // 1. Find all todo queries
      const queryCache = queryClient.getQueryCache()
      const todoQueries = queryCache.findAll({ queryKey: ['todos'] })

      // 2. Cancel ongoing queries to prevent overwriting optimistic update
      await Promise.all(
        todoQueries.map((query) => query.cancel())
      )

      // 3. Save previous data for ALL queries (not just the first one)
      const previousData = new Map<string, { todos: TodoItem[] }>()
      todoQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey)
        const data = query.state.data as { todos: TodoItem[] } | undefined
        if (data) {
          previousData.set(key, data)
        }
      })

      // 4. Optimistically delete from all matching queries
      todoQueries.forEach((query) => {
        queryClient.setQueryData(
          query.queryKey,
          (old: { todos: TodoItem[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              todos: old.todos.filter((todo) => todo.id !== id),
            }
          }
        )
      })

      return { previousData }
    },

    // Rollback on error - restore ALL queries
    onError: (_err, _id, context) => {
      context?.previousData.forEach((data, key) => {
        const queryKey = JSON.parse(key)
        queryClient.setQueryData(queryKey, data)
      })
    },

    // Invalidate queries after mutation completes
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
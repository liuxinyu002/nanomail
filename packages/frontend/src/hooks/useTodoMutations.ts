/**
 * React Query mutation hooks for Todo operations with optimistic updates
 *
 * Provides optimistic UI updates for:
 * - Updating todos (immediate cache update with rollback on error)
 * - Deleting todos (immediate removal with rollback on error)
 * - Restoring todos (move completed todo back to pending)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TodoService } from '@/services'
import type { TodoItem, UpdateTodo } from '@/services'
import type { BoardColumn } from '@nanomail/shared'

/** Fallback color when column not found in cache */
const FALLBACK_COLOR = '#C9CDD4'

/**
 * Get column color from React Query cache instead of hardcoded constants.
 * This ensures optimistic updates use the actual user-customized column colors.
 */
function getColumnColorFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  columnId: number
): string | null {
  const columnsData = queryClient.getQueryData<{ columns: BoardColumn[] }>(['boardColumns'])
  if (!columnsData?.columns) return null

  const column = columnsData.columns.find(c => c.id === columnId)
  return column?.color ?? null
}

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
          (old: { todos?: TodoItem[] } | undefined) => {
            if (!old || !old.todos) return old

            // Check if this is an archive query (queryKey[1] === 'archive')
            const queryKey = query.queryKey as unknown[]
            const isArchiveQuery = queryKey[1] === 'archive'

            // If marking as completed and this is NOT an archive query, remove from list
            if (data.status === 'completed' && !isArchiveQuery) {
              return {
                ...old,
                todos: old.todos.filter((todo) => todo.id !== id),
              }
            }

            // Otherwise, update the todo in place
            return {
              ...old,
              todos: old.todos.map((todo) => {
                if (todo.id !== id) return todo

                // If boardColumnId changes, derive new color from cached column data
                let newColor = todo.color
                if (data.boardColumnId !== undefined) {
                  const cachedColor = getColumnColorFromCache(queryClient, data.boardColumnId)
                  newColor = cachedColor ?? FALLBACK_COLOR
                }

                return { ...todo, ...data, color: newColor }
              }),
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
 * Hook for restoring a completed todo to pending status
 *
 * @example
 * ```tsx
 * const restoreMutation = useRestoreTodoMutation()
 *
 * // Restore todo - moves to Inbox
 * const handleRestore = (todoId: number) => {
 *   restoreMutation.mutate(todoId, {
 *     onSuccess: (restoredTodo) => {
 *       toast.success(`Task restored to Inbox`)
 *     }
 *   })
 * }
 * ```
 */
export function useRestoreTodoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => TodoService.restoreTodo(id),

    // Optimistic update: add restored todo back to active lists
    onMutate: async (id) => {
      // 1. Find all todo queries
      const queryCache = queryClient.getQueryCache()
      const todoQueries = queryCache.findAll({ queryKey: ['todos'] })

      // 2. Cancel ongoing queries
      await Promise.all(todoQueries.map((query) => query.cancel()))

      // 3. Save previous data for rollback
      const previousData = new Map<string, { todos: TodoItem[] }>()
      todoQueries.forEach((query) => {
        const key = JSON.stringify(query.queryKey)
        const data = query.state.data as { todos: TodoItem[] } | undefined
        if (data) {
          previousData.set(key, data)
        }
      })

      // 4. Remove restored todo from archive queries, add to active queries
      todoQueries.forEach((query) => {
        const queryKey = query.queryKey as unknown[]
        const isArchiveQuery = queryKey[1] === 'archive'

        queryClient.setQueryData(
          query.queryKey,
          (old: { todos?: TodoItem[] } | undefined) => {
            if (!old || !old.todos) return old
            if (isArchiveQuery) {
              // Remove from archive
              return {
                ...old,
                todos: old.todos.filter((todo) => todo.id !== id),
              }
            }
            // The restored todo will be added via server response
            // We don't add it here to avoid duplication
            return old
          }
        )
      })

      return { previousData }
    },

    // Rollback on error
    onError: (_err, _id, context) => {
      context?.previousData.forEach((data, key) => {
        const queryKey = JSON.parse(key)
        queryClient.setQueryData(queryKey, data)
      })
    },

    // Invalidate both active and archive queries
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
          (old: { todos?: TodoItem[] } | undefined) => {
            if (!old || !old.todos) return old
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
/**
 * React Query hook for fetching all todos
 *
 * Used by TodosPage for the list view.
 * Mutation hooks (useUpdateTodoMutation, useDeleteTodoMutation) will automatically
 * update the cache when changes occur.
 */

import { useQuery } from '@tanstack/react-query'
import { TodoService } from '@/services'

export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: () => TodoService.getTodos(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
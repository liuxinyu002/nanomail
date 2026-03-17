/**
 * React Query hooks for board column operations
 *
 * Provides hooks for:
 * - Fetching all board columns
 * - Creating new columns
 * - Updating columns
 * - Deleting columns (blocked for system columns)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BoardColumnService } from '@/services'
import type { CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'

/**
 * Hook for fetching all board columns
 *
 * @example
 * ```tsx
 * const { data: columns, isLoading, error } = useBoardColumns()
 *
 * if (isLoading) return <Spinner />
 * if (error) return <Error />
 *
 * return columns.map(col => <Column key={col.id} {...col} />)
 * ```
 */
export function useBoardColumns() {
  return useQuery({
    queryKey: ['boardColumns'],
    queryFn: () => BoardColumnService.getBoardColumns(),
  })
}

/**
 * Hook for creating a new board column
 *
 * Automatically invalidates the boardColumns query on success.
 *
 * @example
 * ```tsx
 * const createMutation = useCreateBoardColumnMutation()
 *
 * const handleCreate = (name: string) => {
 *   createMutation.mutate({
 *     name,
 *     order: columns.length,
 *     color: '#3498db'
 *   })
 * }
 * ```
 */
export function useCreateBoardColumnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBoardColumn) => BoardColumnService.createBoardColumn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns'] })
    },
  })
}

/**
 * Hook for updating a board column
 *
 * Automatically invalidates the boardColumns query on success.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateBoardColumnMutation()
 *
 * const handleRename = (id: number, newName: string) => {
 *   updateMutation.mutate({
 *     id,
 *     data: { name: newName }
 *   })
 * }
 * ```
 */
export function useUpdateBoardColumnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBoardColumn }) =>
      BoardColumnService.updateBoardColumn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns'] })
    },
  })
}

/**
 * Hook for deleting a board column
 *
 * Note: System columns (isSystem: true) cannot be deleted.
 * The backend will reject the request with an error.
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteBoardColumnMutation()
 *
 * const handleDelete = (column: BoardColumn) => {
 *   if (column.isSystem) {
 *     alert('Cannot delete system column')
 *     return
 *   }
 *   deleteMutation.mutate(column.id)
 * }
 * ```
 */
export function useDeleteBoardColumnMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => BoardColumnService.deleteBoardColumn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardColumns'] })
    },
  })
}
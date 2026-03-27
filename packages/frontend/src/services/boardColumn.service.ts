/**
 * BoardColumn Service
 * Handles API calls for board column operations (Kanban columns)
 */

import type { BoardColumn, CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'
import { buildApiUrl } from '@/config/api.config'

// Re-export types for convenience
export type { BoardColumn, CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'

/**
 * BoardColumn Service - handles all board column-related API calls
 */
export const BoardColumnService = {
  /**
   * Fetch all board columns
   */
  async getBoardColumns(): Promise<BoardColumn[]> {
    const response = await fetch(buildApiUrl('/api/board-columns'))

    if (!response.ok) {
      throw new Error('Failed to fetch board columns')
    }

    const data = await response.json()
    return data.columns
  },

  /**
   * Create a new board column
   */
  async createBoardColumn(data: CreateBoardColumn): Promise<BoardColumn> {
    const response = await fetch(buildApiUrl('/api/board-columns'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to create board column'
      try {
        const errorData = await response.json()
        if (errorData?.error) {
          errorMessage = `Failed to create column "${data.name}": ${errorData.error}`
        }
      } catch {
        errorMessage = `Failed to create column "${data.name}" (status ${response.status})`
      }
      throw new Error(errorMessage)
    }

    return response.json()
  },

  /**
   * Update a board column
   */
  async updateBoardColumn(id: number, data: UpdateBoardColumn): Promise<BoardColumn> {
    const response = await fetch(buildApiUrl(`/api/board-columns/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to update board column'
      try {
        const errorData = await response.json()
        if (errorData?.error) {
          errorMessage = `Failed to update column (ID: ${id}): ${errorData.error}`
        }
      } catch {
        errorMessage = `Failed to update column (ID: ${id}, status ${response.status})`
      }
      throw new Error(errorMessage)
    }

    return response.json()
  },

  /**
   * Delete a board column
   * Note: System columns (isSystem: true) cannot be deleted - backend will reject
   *
   * @returns Object with message and count of moved tasks
   */
  async deleteBoardColumn(id: number): Promise<{ message: string; movedTasks: number }> {
    const response = await fetch(buildApiUrl(`/api/board-columns/${id}`), {
      method: 'DELETE',
    })

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to delete column'
      try {
        const errorData = await response.json()
        if (errorData?.error) {
          errorMessage = `Failed to delete column (ID: ${id}): ${errorData.error}`
        }
      } catch {
        errorMessage = `Failed to delete column (ID: ${id}, status ${response.status})`
      }
      throw new Error(errorMessage)
    }

    return response.json()
  },
}
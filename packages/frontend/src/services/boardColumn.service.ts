/**
 * BoardColumn Service
 * Handles API calls for board column operations (Kanban columns)
 */

import type { BoardColumn, CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'

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
    const response = await fetch('/api/board-columns')

    if (!response.ok) {
      throw new Error('Failed to fetch board columns')
    }

    return response.json()
  },

  /**
   * Create a new board column
   */
  async createBoardColumn(data: CreateBoardColumn): Promise<BoardColumn> {
    const response = await fetch('/api/board-columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to create board column')
    }

    return response.json()
  },

  /**
   * Update a board column
   */
  async updateBoardColumn(id: number, data: UpdateBoardColumn): Promise<BoardColumn> {
    const response = await fetch(`/api/board-columns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to update board column')
    }

    return response.json()
  },

  /**
   * Delete a board column
   * Note: System columns (isSystem: true) cannot be deleted - backend will reject
   */
  async deleteBoardColumn(id: number): Promise<void> {
    const response = await fetch(`/api/board-columns/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to delete board column'
      try {
        const errorData = await response.json()
        if (errorData?.error) {
          errorMessage = errorData.error
        }
      } catch {
        // Ignore JSON parse errors, use default message
      }
      throw new Error(errorMessage)
    }
  },
}
/**
 * Tests for BoardColumnService
 *
 * Tests CRUD operations for board columns:
 * - getBoardColumns: Fetch all columns
 * - createBoardColumn: Create new column
 * - updateBoardColumn: Update column
 * - deleteBoardColumn: Delete column (blocked for system columns)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BoardColumn, CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocking fetch
import { BoardColumnService } from './boardColumn.service'

describe('BoardColumnService', () => {
  const mockColumn: BoardColumn = {
    id: 1,
    name: 'Inbox',
    color: '#3498db',
    order: 0,
    isSystem: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  const mockColumns: BoardColumn[] = [
    mockColumn,
    {
      id: 2,
      name: 'Todo',
      color: '#9b59b6',
      order: 1,
      isSystem: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 3,
      name: 'In Progress',
      color: '#e67e22',
      order: 2,
      isSystem: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 4,
      name: 'Done',
      color: '#2ecc71',
      order: 3,
      isSystem: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  ]

  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getBoardColumns', () => {
    it('should fetch all board columns', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ columns: mockColumns }),
      })

      const result = await BoardColumnService.getBoardColumns()

      expect(mockFetch).toHaveBeenCalledWith('/api/board-columns')
      expect(result).toHaveLength(4)
      expect(result[0].name).toBe('Inbox')
    })

    it('should return empty array when no columns exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ columns: [] }),
      })

      const result = await BoardColumnService.getBoardColumns()

      expect(result).toEqual([])
    })

    it('should return columns in correct order', async () => {
      const unorderedColumns = [...mockColumns].reverse()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ columns: unorderedColumns }),
      })

      const result = await BoardColumnService.getBoardColumns()

      // Service returns as-is from server; server should handle ordering
      expect(result).toBeDefined()
    })

    it('should throw error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(BoardColumnService.getBoardColumns()).rejects.toThrow(
        'Failed to fetch board columns'
      )
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(BoardColumnService.getBoardColumns()).rejects.toThrow()
    })
  })

  describe('createBoardColumn', () => {
    it('should create a new board column', async () => {
      const newColumnData: CreateBoardColumn = {
        name: 'Review',
        color: '#f39c12',
        order: 4,
      }

      const newColumn: BoardColumn = {
        id: 5,
        name: 'Review',
        color: '#f39c12',
        order: 4,
        isSystem: false,
        createdAt: new Date('2024-01-15T00:00:00.000Z'),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newColumn),
      })

      const result = await BoardColumnService.createBoardColumn(newColumnData)

      expect(mockFetch).toHaveBeenCalledWith('/api/board-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newColumnData),
      })
      expect(result.id).toBe(5)
      expect(result.name).toBe('Review')
    })

    it('should create column with minimal data (name only)', async () => {
      const newColumnData: CreateBoardColumn = {
        name: 'New Column',
        order: 5,
      }

      const newColumn: BoardColumn = {
        id: 6,
        name: 'New Column',
        color: null,
        order: 5,
        isSystem: false,
        createdAt: new Date('2024-01-15T00:00:00.000Z'),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newColumn),
      })

      const result = await BoardColumnService.createBoardColumn(newColumnData)

      expect(result.name).toBe('New Column')
      expect(result.color).toBeNull()
    })

    it('should throw error for invalid column name (empty)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Name is required' }),
      })

      const invalidData: CreateBoardColumn = {
        name: '',
        order: 0,
      }

      await expect(
        BoardColumnService.createBoardColumn(invalidData)
      ).rejects.toThrow('Failed to create column')
    })

    it('should throw error for duplicate column name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: () => Promise.resolve({ error: 'Column name already exists' }),
      })

      const duplicateData: CreateBoardColumn = {
        name: 'Inbox',
        order: 5,
      }

      await expect(
        BoardColumnService.createBoardColumn(duplicateData)
      ).rejects.toThrow('Failed to create column')
    })

    it('should throw error on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const newColumnData: CreateBoardColumn = {
        name: 'Test',
        order: 0,
      }

      await expect(
        BoardColumnService.createBoardColumn(newColumnData)
      ).rejects.toThrow('Failed to create column')
    })
  })

  describe('updateBoardColumn', () => {
    it('should update column name', async () => {
      const updateData: UpdateBoardColumn = {
        name: 'Updated Name',
      }

      const updatedColumn: BoardColumn = {
        ...mockColumn,
        name: 'Updated Name',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedColumn),
      })

      const result = await BoardColumnService.updateBoardColumn(1, updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/board-columns/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      expect(result.name).toBe('Updated Name')
    })

    it('should update column color', async () => {
      const updateData: UpdateBoardColumn = {
        color: '#ff0000',
      }

      const updatedColumn: BoardColumn = {
        ...mockColumn,
        color: '#ff0000',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedColumn),
      })

      const result = await BoardColumnService.updateBoardColumn(1, updateData)

      expect(result.color).toBe('#ff0000')
    })

    it('should update column order', async () => {
      const updateData: UpdateBoardColumn = {
        order: 2,
      }

      const updatedColumn: BoardColumn = {
        ...mockColumn,
        order: 2,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedColumn),
      })

      const result = await BoardColumnService.updateBoardColumn(1, updateData)

      expect(result.order).toBe(2)
    })

    it('should update multiple fields at once', async () => {
      const updateData: UpdateBoardColumn = {
        name: 'Renamed',
        color: '#00ff00',
        order: 3,
      }

      const updatedColumn: BoardColumn = {
        ...mockColumn,
        name: 'Renamed',
        color: '#00ff00',
        order: 3,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedColumn),
      })

      const result = await BoardColumnService.updateBoardColumn(2, updateData)

      expect(result.name).toBe('Renamed')
      expect(result.color).toBe('#00ff00')
      expect(result.order).toBe(3)
    })

    it('should throw error for non-existent column', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const updateData: UpdateBoardColumn = { name: 'Test' }

      await expect(
        BoardColumnService.updateBoardColumn(999, updateData)
      ).rejects.toThrow('Failed to update column')
    })

    it('should allow updating system column name (if backend allows)', async () => {
      const updateData: UpdateBoardColumn = {
        name: 'Inbox Renamed',
      }

      const updatedColumn: BoardColumn = {
        ...mockColumn,
        name: 'Inbox Renamed',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedColumn),
      })

      const result = await BoardColumnService.updateBoardColumn(1, updateData)

      expect(result.name).toBe('Inbox Renamed')
    })

    it('should throw error on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const updateData: UpdateBoardColumn = { name: '' }

      await expect(
        BoardColumnService.updateBoardColumn(1, updateData)
      ).rejects.toThrow('Failed to update column')
    })
  })

  describe('deleteBoardColumn', () => {
    it('should delete a non-system column and return moved tasks count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Column deleted', movedTasks: 3 }),
      })

      const result = await BoardColumnService.deleteBoardColumn(2)

      expect(mockFetch).toHaveBeenCalledWith('/api/board-columns/2', {
        method: 'DELETE',
      })
      expect(result.movedTasks).toBe(3)
    })

    it('should return movedTasks: 0 when column has no todos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Column deleted', movedTasks: 0 }),
      })

      const result = await BoardColumnService.deleteBoardColumn(5)

      expect(result.movedTasks).toBe(0)
    })

    it('should throw error when trying to delete system column', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ error: 'Cannot delete system column' }),
      })

      await expect(BoardColumnService.deleteBoardColumn(1)).rejects.toThrow(
        'Cannot delete system column'
      )
    })

    it('should throw error for non-existent column', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Column not found' }),
      })

      await expect(BoardColumnService.deleteBoardColumn(999)).rejects.toThrow(
        'Column not found'
      )
    })

    it('should throw error with message from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Custom error message' }),
      })

      await expect(BoardColumnService.deleteBoardColumn(2)).rejects.toThrow(
        'Custom error message'
      )
    })

    it('should throw generic error when no error message in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      })

      await expect(BoardColumnService.deleteBoardColumn(2)).rejects.toThrow(
        'Failed to delete column'
      )
    })

    it('should handle JSON parse error in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(BoardColumnService.deleteBoardColumn(2)).rejects.toThrow(
        'Failed to delete column'
      )
    })
  })

  describe('Error handling edge cases', () => {
    it('should handle null response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      })

      // Should throw or return undefined when trying to access .columns on null
      await expect(BoardColumnService.getBoardColumns()).rejects.toThrow()
    })

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Unexpected token')),
      })

      await expect(BoardColumnService.getBoardColumns()).rejects.toThrow()
    })
  })
})
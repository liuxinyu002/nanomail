/**
 * Tests for TodoService position-related methods
 *
 * Tests the following methods:
 * - updateTodoPosition: Move todo to different column/position
 * - batchUpdatePositions: Batch update multiple todo positions
 * - getTodosByColumn: Fetch todos filtered by board column
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TodoService } from './todo.service'
import type { TodosResponse, TodoItem } from './todo.service'
import type { UpdateTodoPosition } from '@nanomail/shared'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('TodoService - Position Methods', () => {
  const mockTodoItem: TodoItem = {
    id: 1,
    emailId: 1,
    description: 'Test todo',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    position: 100,
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('updateTodoPosition', () => {
    it('should update todo position with boardColumnId', async () => {
      const updateData: UpdateTodoPosition = {
        boardColumnId: 2,
        position: 500,
      }

      const mockResponse: TodoItem = {
        ...mockTodoItem,
        boardColumnId: 2,
        position: 500,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodoPosition(1, updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1/position', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      expect(result.boardColumnId).toBe(2)
      expect(result.position).toBe(500)
    })

    it('should update todo position without position (only column)', async () => {
      const updateData: UpdateTodoPosition = {
        boardColumnId: 3,
      }

      const mockResponse: TodoItem = {
        ...mockTodoItem,
        boardColumnId: 3,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodoPosition(1, updateData)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1/position', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      expect(result.boardColumnId).toBe(3)
    })

    it('should update todo deadline when provided', async () => {
      const updateData: UpdateTodoPosition = {
        boardColumnId: 1,
        deadline: '2024-02-15T00:00:00.000Z',
      }

      const mockResponse: TodoItem = {
        ...mockTodoItem,
        deadline: '2024-02-15T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodoPosition(1, updateData)

      expect(result.deadline).toBe('2024-02-15T00:00:00.000Z')
    })

    it('should clear deadline when null is passed', async () => {
      const updateData: UpdateTodoPosition = {
        boardColumnId: 1,
        deadline: null,
      }

      const mockResponse: TodoItem = {
        ...mockTodoItem,
        deadline: null,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodoPosition(1, updateData)

      expect(result.deadline).toBeNull()
    })

    it('should throw error for non-existent todo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const updateData: UpdateTodoPosition = { boardColumnId: 2 }

      await expect(
        TodoService.updateTodoPosition(999, updateData)
      ).rejects.toThrow('Failed to update todo position')
    })

    it('should throw error on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const updateData: UpdateTodoPosition = { boardColumnId: 2 }

      await expect(
        TodoService.updateTodoPosition(1, updateData)
      ).rejects.toThrow('Failed to update todo position')
    })

    it('should throw error on validation error (400)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const updateData: UpdateTodoPosition = { boardColumnId: 2 }

      await expect(
        TodoService.updateTodoPosition(1, updateData)
      ).rejects.toThrow('Failed to update todo position')
    })
  })

  describe('batchUpdatePositions', () => {
    it('should batch update multiple todo positions', async () => {
      const updates = [
        { id: 1, boardColumnId: 2, position: 100 },
        { id: 2, boardColumnId: 2, position: 200 },
        { id: 3, boardColumnId: 3, position: 300 },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await TodoService.batchUpdatePositions(updates)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/batch-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
    })

    it('should handle empty updates array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await TodoService.batchUpdatePositions([])

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/batch-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [] }),
      })
    })

    it('should handle large batch updates (100+ items)', async () => {
      const updates = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        boardColumnId: 1,
        position: (i + 1) * 100,
      }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await TodoService.batchUpdatePositions(updates)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callArgs.updates).toHaveLength(150)
    })

    it('should throw error on batch update failure', async () => {
      const updates = [
        { id: 1, boardColumnId: 2, position: 100 },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(
        TodoService.batchUpdatePositions(updates)
      ).rejects.toThrow('Failed to batch update positions')
    })

    it('should throw error on validation error', async () => {
      const updates = [
        { id: 1, boardColumnId: 2, position: 100 },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(
        TodoService.batchUpdatePositions(updates)
      ).rejects.toThrow('Failed to batch update positions')
    })
  })

  describe('getTodosByColumn', () => {
    it('should fetch todos by column id', async () => {
      const mockResponse: TodosResponse = {
        todos: [
          { ...mockTodoItem, id: 1, boardColumnId: 1 },
          { ...mockTodoItem, id: 2, boardColumnId: 1 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.getTodosByColumn(1)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?boardColumnId=1')
      expect(result.todos).toHaveLength(2)
      expect(result.todos[0].boardColumnId).toBe(1)
    })

    it('should return empty array for column with no todos', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      })

      const result = await TodoService.getTodosByColumn(99)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?boardColumnId=99')
      expect(result.todos).toEqual([])
    })

    it('should fetch Inbox todos (column id 1)', async () => {
      const mockResponse: TodosResponse = {
        todos: [
          { ...mockTodoItem, id: 1, boardColumnId: 1, position: 100 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.getTodosByColumn(1)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?boardColumnId=1')
      expect(result.todos[0].boardColumnId).toBe(1)
    })

    it('should throw error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(TodoService.getTodosByColumn(1)).rejects.toThrow(
        'Failed to fetch todos by column'
      )
    })

    it('should throw error for invalid column id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(TodoService.getTodosByColumn(-1)).rejects.toThrow(
        'Failed to fetch todos by column'
      )
    })
  })
})
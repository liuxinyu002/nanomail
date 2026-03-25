import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TodoService } from './todo.service'
import type { TodosResponse, TodoStatus, TodoItem } from './todo.service'
import type { ArchivedTodosResponse } from '@nanomail/shared'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('TodoService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getTodos', () => {
    it('should fetch all todos', async () => {
      const mockResponse: TodosResponse = {
        todos: [
          {
            id: 1,
            emailId: 1,
            description: 'Review the report',
            status: 'pending',
            deadline: null,
            boardColumnId: 1,
            position: 100,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.getTodos()

      expect(mockFetch).toHaveBeenCalledWith('/api/todos')
      expect(result).toEqual(mockResponse)
    })

    it('should filter todos by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      })

      await TodoService.getTodos({ status: 'pending' })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?status=pending')
    })

    it('should filter todos by emailId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      })

      await TodoService.getTodos({ emailId: 1 })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?emailId=1')
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(TodoService.getTodos()).rejects.toThrow('Failed to fetch todos')
    })
  })

  describe('updateTodoStatus', () => {
    it('should update todo status', async () => {
      const mockResponse: TodoItem = {
        id: 1,
        emailId: 1,
        description: 'Review the report',
        status: 'completed' as TodoStatus,
        deadline: null,
        boardColumnId: 1,
        position: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodoStatus(1, 'completed')

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      expect(result.status).toBe('completed')
    })

    it('should throw error for non-existent todo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(TodoService.updateTodoStatus(999, 'completed')).rejects.toThrow('Failed to update todo status')
    })
  })

  describe('getTodosByDateRange', () => {
    it('should fetch todos by date range', async () => {
      const mockResponse: TodosResponse = {
        todos: [
          {
            id: 1,
            emailId: 1,
            description: 'Task for the week',
            status: 'pending',
            deadline: '2024-01-15T00:00:00.000Z',
            boardColumnId: 1,
            position: 100,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.getTodosByDateRange({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?startDate=2024-01-01&endDate=2024-01-31')
      expect(result).toEqual(mockResponse)
    })

    it('should return empty array for no todos in range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      })

      const result = await TodoService.getTodosByDateRange({
        startDate: '2024-02-01',
        endDate: '2024-02-28',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?startDate=2024-02-01&endDate=2024-02-28')
      expect(result.todos).toEqual([])
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(
        TodoService.getTodosByDateRange({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
      ).rejects.toThrow('Failed to fetch todos by date range')
    })
  })

  describe('updateTodo', () => {
    it('should update todo description', async () => {
      const mockResponse: TodoItem = {
        id: 1,
        emailId: 1,
        description: 'Updated description',
        status: 'pending',
        deadline: null,
        boardColumnId: 1,
        position: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodo(1, { description: 'Updated description' })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated description' }),
      })
      expect(result.description).toBe('Updated description')
    })

    it('should update todo boardColumnId', async () => {
      const mockResponse: TodoItem = {
        id: 1,
        emailId: 1,
        description: 'Review the report',
        status: 'pending',
        deadline: null,
        boardColumnId: 2,
        position: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodo(1, { boardColumnId: 2 })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardColumnId: 2 }),
      })
      expect(result.boardColumnId).toBe(2)
    })

    it('should update todo status', async () => {
      const mockResponse: TodoItem = {
        id: 1,
        emailId: 1,
        description: 'Review the report',
        status: 'completed',
        deadline: null,
        boardColumnId: 1,
        position: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodo(1, { status: 'completed' })

      expect(result.status).toBe('completed')
    })

    it('should update todo deadline', async () => {
      const mockResponse: TodoItem = {
        id: 1,
        emailId: 1,
        description: 'Review the report',
        status: 'pending',
        deadline: '2024-02-01T00:00:00.000Z',
        boardColumnId: 1,
        position: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodo(1, { deadline: '2024-02-01T00:00:00.000Z' })

      expect(result.deadline).toBe('2024-02-01T00:00:00.000Z')
    })

    it('should clear todo deadline by setting null', async () => {
      const mockResponse: TodoItem = {
        id: 1,
        emailId: 1,
        description: 'Review the report',
        status: 'pending',
        deadline: null,
        boardColumnId: 1,
        position: 100,
        createdAt: '2024-01-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.updateTodo(1, { deadline: null })

      expect(result.deadline).toBeNull()
    })

    it('should throw error for non-existent todo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(TodoService.updateTodo(999, { description: 'Test' })).rejects.toThrow('Failed to update todo')
    })
  })

  describe('deleteTodo', () => {
    it('should delete a todo successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      await TodoService.deleteTodo(1)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE',
      })
    })

    it('should throw error for non-existent todo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(TodoService.deleteTodo(999)).rejects.toThrow('Failed to delete todo')
    })

    it('should throw error on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(TodoService.deleteTodo(1)).rejects.toThrow('Failed to delete todo')
    })
  })

  // =====================================================
  // Phase 4: Archive Feature Tests
  // =====================================================

  describe('getTodos with excludeStatus', () => {
    it('should exclude completed todos when excludeStatus=completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      })

      await TodoService.getTodos({ excludeStatus: 'completed' })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?excludeStatus=completed')
    })

    it('should combine excludeStatus with other filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ todos: [] }),
      })

      await TodoService.getTodos({ excludeStatus: 'completed', boardColumnId: 1 })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos?excludeStatus=completed&boardColumnId=1')
    })
  })

  describe('getArchivedTodos', () => {
    it('should fetch archived todos with default limit', async () => {
      const mockResponse: ArchivedTodosResponse = {
        todos: [],
        nextCursor: null,
        hasMore: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.getArchivedTodos({ limit: 20 })

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/archive?limit=20')
      expect(result).toEqual(mockResponse)
    })

    it('should fetch archived todos with cursor', async () => {
      const cursor = Buffer.from(JSON.stringify({ completedAt: '2024-03-15T10:00:00Z', id: 5 })).toString('base64')
      const mockResponse: ArchivedTodosResponse = {
        todos: [],
        nextCursor: null,
        hasMore: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.getArchivedTodos({ limit: 20, cursor })

      expect(mockFetch).toHaveBeenCalledWith(`/api/todos/archive?limit=20&cursor=${encodeURIComponent(cursor)}`)
      expect(result).toEqual(mockResponse)
    })

    it('should return archived todos with nextCursor when hasMore is true', async () => {
      const nextCursor = Buffer.from(JSON.stringify({ completedAt: '2024-03-14T10:00:00Z', id: 3 })).toString('base64')
      // Note: Using `as any` because API returns string dates, but TypeScript type expects Date
      const mockResponse = {
        todos: [
          {
            id: 1,
            emailId: 1,
            description: 'Completed task',
            status: 'completed',
            deadline: null,
            boardColumnId: 4,
            position: 0,
            notes: null,
            color: '#10B981',
            source: 'manual',
            completedAt: '2024-03-15T10:00:00.000Z',
            createdAt: '2024-03-01T00:00:00.000Z',
          },
        ],
        nextCursor,
        hasMore: true,
      } as any
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.getArchivedTodos({ limit: 1 })

      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe(nextCursor)
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(TodoService.getArchivedTodos({ limit: 20 })).rejects.toThrow('Failed to fetch archived todos')
    })
  })

  describe('restoreTodo', () => {
    it('should restore a completed todo', async () => {
      const mockResponse = {
        id: 1,
        emailId: 1,
        description: 'Restored task',
        status: 'pending',
        deadline: null,
        boardColumnId: 1,
        position: 0,
        notes: null,
        color: null,
        source: 'manual',
        completedAt: null,
        createdAt: '2024-03-01T00:00:00.000Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await TodoService.restoreTodo(1)

      expect(mockFetch).toHaveBeenCalledWith('/api/todos/1/restore', {
        method: 'POST',
      })
      expect(result.status).toBe('pending')
      expect(result.boardColumnId).toBe(1)
    })

    it('should throw error for non-existent todo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(TodoService.restoreTodo(999)).rejects.toThrow('Failed to restore todo')
    })

    it('should throw error when trying to restore non-completed todo', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(TodoService.restoreTodo(1)).rejects.toThrow('Failed to restore todo')
    })
  })
})
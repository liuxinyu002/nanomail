import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TodoService } from './todo.service'
import type { TodosResponse, TodoStatus } from './todo.service'

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
            urgency: 'high',
            status: 'pending',
            deadline: null,
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
      const mockResponse = {
        id: 1,
        emailId: 1,
        description: 'Review the report',
        urgency: 'high',
        status: 'completed' as TodoStatus,
        deadline: null,
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
      expect(result).toEqual(mockResponse)
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
})
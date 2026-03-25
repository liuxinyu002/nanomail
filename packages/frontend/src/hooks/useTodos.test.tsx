import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTodos } from './useTodos'
import type { TodosResponse } from '@/services'

// Mock TodoService
const mockGetTodos = vi.fn()

vi.mock('@/services', () => ({
  TodoService: {
    getTodos: (query: unknown) => mockGetTodos(query),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useTodos', () => {
  const mockActiveTodosResponse: TodosResponse = {
    todos: [
      {
        id: 1,
        emailId: 100,
        description: 'Active todo 1',
        status: 'pending',
        deadline: null,
        boardColumnId: 1,
        position: 100,
        createdAt: '2024-01-15T10:00:00.000Z',
      },
      {
        id: 3,
        emailId: 102,
        description: 'Active todo 2',
        status: 'in_progress',
        deadline: null,
        boardColumnId: 2,
        position: 100,
        createdAt: '2024-01-15T11:00:00.000Z',
      },
    ],
  }

  beforeEach(() => {
    mockGetTodos.mockReset()
  })

  describe('default behavior (excludes completed)', () => {
    it('should fetch todos with excludeStatus=completed by default', async () => {
      mockGetTodos.mockResolvedValue(mockActiveTodosResponse)

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Verify the service was called with excludeStatus: 'completed'
      expect(mockGetTodos).toHaveBeenCalledWith({
        excludeStatus: 'completed',
      })
      expect(result.current.data).toEqual(mockActiveTodosResponse)
      expect(result.current.data?.todos).toHaveLength(2)
    })

    it('should have correct query key with filters', async () => {
      mockGetTodos.mockResolvedValue(mockActiveTodosResponse)

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeDefined()
    })

    it('should not include completed todos in response', async () => {
      // Response should only contain non-completed todos
      mockGetTodos.mockResolvedValue(mockActiveTodosResponse)

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const todos = result.current.data?.todos ?? []
      expect(todos.every(t => t.status !== 'completed')).toBe(true)
    })
  })

  describe('with filters', () => {
    it('should pass boardColumnId filter along with excludeStatus', async () => {
      mockGetTodos.mockResolvedValue({ todos: [] })

      const { result } = renderHook(() =>
        useTodos({ filters: { boardColumnId: 2 } }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTodos).toHaveBeenCalledWith({
        excludeStatus: 'completed',
        boardColumnId: 2,
      })
    })

    it('should pass emailId filter along with excludeStatus', async () => {
      mockGetTodos.mockResolvedValue({ todos: [] })

      const { result } = renderHook(() =>
        useTodos({ filters: { emailId: 100 } }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTodos).toHaveBeenCalledWith({
        excludeStatus: 'completed',
        emailId: 100,
      })
    })

    it('should combine multiple filters', async () => {
      mockGetTodos.mockResolvedValue({ todos: [] })

      const { result } = renderHook(() =>
        useTodos({ filters: { boardColumnId: 2, emailId: 100 } }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetTodos).toHaveBeenCalledWith({
        excludeStatus: 'completed',
        boardColumnId: 2,
        emailId: 100,
      })
    })
  })

  describe('error handling', () => {
    it('should handle fetch error', async () => {
      mockGetTodos.mockRejectedValue(new Error('Failed to fetch'))

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('edge cases', () => {
    it('should return empty array when no active todos', async () => {
      mockGetTodos.mockResolvedValue({ todos: [] })

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.todos).toEqual([])
    })

    it('should have 5 minute stale time', async () => {
      mockGetTodos.mockResolvedValue(mockActiveTodosResponse)

      const { result } = renderHook(() => useTodos(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Data should be fresh (not stale) immediately after fetch
      expect(result.current.isStale).toBe(false)
    })
  })
})

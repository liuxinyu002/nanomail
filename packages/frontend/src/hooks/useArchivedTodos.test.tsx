import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useArchivedTodos, flattenArchivedTodos } from './useArchivedTodos'
import { TodoService } from '@/services'
import type { ArchivedTodosResponse } from '@nanomail/shared'

// Mock TodoService
vi.mock('@/services', () => ({
  TodoService: {
    getArchivedTodos: vi.fn(),
  },
}))

const mockGetArchivedTodos = vi.mocked(TodoService.getArchivedTodos)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

function createMockTodo(id: number, completedAt: string = '2024-03-20T10:00:00Z') {
  return {
    id,
    emailId: 1,
    description: `Completed todo ${id}`,
    status: 'completed' as const,
    deadline: null,
    boardColumnId: 4,
    position: 0,
    notes: null,
    color: '#10B981',
    source: 'manual' as const,
    completedAt,
    createdAt: '2024-03-15T00:00:00.000Z',
  }
}

describe('useArchivedTodos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('when disabled (default)', () => {
    it('should not fetch when enabled is false (default)', async () => {
      const { result } = renderHook(() => useArchivedTodos(), {
        wrapper: createWrapper(),
      })

      // Wait for any potential fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not have called the API
      expect(mockGetArchivedTodos).not.toHaveBeenCalled()
    })

    it('should not fetch when explicitly disabled', async () => {
      const { result } = renderHook(() => useArchivedTodos({ enabled: false }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetArchivedTodos).not.toHaveBeenCalled()
    })
  })

  describe('when enabled', () => {
    it('should fetch archived todos when enabled', async () => {
      const mockResponse: ArchivedTodosResponse = {
        todos: [createMockTodo(1)],
        nextCursor: null,
        hasMore: false,
      }
      mockGetArchivedTodos.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useArchivedTodos({ enabled: true }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetArchivedTodos).toHaveBeenCalledWith({
        limit: 20,
        cursor: undefined,
      })
      expect(result.current.data?.pages[0]).toEqual(mockResponse)
    })

    it('should use custom limit', async () => {
      const mockResponse: ArchivedTodosResponse = {
        todos: [],
        nextCursor: null,
        hasMore: false,
      }
      mockGetArchivedTodos.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useArchivedTodos({ limit: 50, enabled: true }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetArchivedTodos).toHaveBeenCalledWith({
        limit: 50,
        cursor: undefined,
      })
    })

    it('should fetch next page with cursor', async () => {
      const cursor = Buffer.from(JSON.stringify({ completedAt: '2024-03-19T10:00:00Z', id: 5 })).toString('base64')

      const firstPageResponse: ArchivedTodosResponse = {
        todos: [createMockTodo(1), createMockTodo(2)],
        nextCursor: cursor,
        hasMore: true,
      }
      const secondPageResponse: ArchivedTodosResponse = {
        todos: [createMockTodo(3)],
        nextCursor: null,
        hasMore: false,
      }

      mockGetArchivedTodos
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse)

      const { result } = renderHook(() => useArchivedTodos({ enabled: true }), {
        wrapper: createWrapper(),
      })

      // Wait for first page
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data?.pages).toHaveLength(1)
      expect(result.current.hasNextPage).toBe(true)

      // Fetch next page
      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => {
        expect(result.current.isFetchingNextPage).toBe(false)
      })

      expect(mockGetArchivedTodos).toHaveBeenCalledTimes(2)
      expect(mockGetArchivedTodos).toHaveBeenNthCalledWith(2, {
        limit: 20,
        cursor,
      })
      expect(result.current.data?.pages).toHaveLength(2)
    })

    it('should indicate no more pages when hasMore is false', async () => {
      const mockResponse: ArchivedTodosResponse = {
        todos: [createMockTodo(1)],
        nextCursor: null,
        hasMore: false,
      }
      mockGetArchivedTodos.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useArchivedTodos({ enabled: true }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.hasNextPage).toBe(false)
    })

    it('should handle empty archive', async () => {
      const mockResponse: ArchivedTodosResponse = {
        todos: [],
        nextCursor: null,
        hasMore: false,
      }
      mockGetArchivedTodos.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useArchivedTodos({ enabled: true }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data?.pages[0].todos).toHaveLength(0)
    })

    it('should handle fetch errors', async () => {
      mockGetArchivedTodos.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useArchivedTodos({ enabled: true }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Network error')
    })
  })
})

describe('flattenArchivedTodos', () => {
  it('should return empty array when data is undefined', () => {
    expect(flattenArchivedTodos(undefined)).toEqual([])
  })

  it('should flatten single page', () => {
    const pages: ArchivedTodosResponse[] = [{
      todos: [createMockTodo(1), createMockTodo(2)],
      nextCursor: null,
      hasMore: false,
    }]

    const result = flattenArchivedTodos(pages)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
  })

  it('should flatten multiple pages', () => {
    const pages: ArchivedTodosResponse[] = [
      {
        todos: [createMockTodo(1), createMockTodo(2)],
        nextCursor: 'cursor1',
        hasMore: true,
      },
      {
        todos: [createMockTodo(3)],
        nextCursor: null,
        hasMore: false,
      },
    ]

    const result = flattenArchivedTodos(pages)

    expect(result).toHaveLength(3)
    expect(result.map(t => t.id)).toEqual([1, 2, 3])
  })

  it('should handle empty pages', () => {
    const pages: ArchivedTodosResponse[] = [{
      todos: [],
      nextCursor: null,
      hasMore: false,
    }]

    expect(flattenArchivedTodos(pages)).toEqual([])
  })
})

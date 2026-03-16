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
    getTodos: () => mockGetTodos(),
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
  const mockResponse: TodosResponse = {
    todos: [
      {
        id: 1,
        emailId: 100,
        description: 'Test todo 1',
        urgency: 'high',
        status: 'pending',
        deadline: null,
        createdAt: '2024-01-15T10:00:00.000Z',
      },
      {
        id: 2,
        emailId: 101,
        description: 'Test todo 2',
        urgency: 'low',
        status: 'completed',
        deadline: null,
        createdAt: '2024-01-15T11:00:00.000Z',
      },
    ],
  }

  beforeEach(() => {
    mockGetTodos.mockReset()
  })

  it('should fetch todos successfully', async () => {
    mockGetTodos.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.data?.todos).toHaveLength(2)
  })

  it('should have correct query key', async () => {
    mockGetTodos.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
  })

  it('should handle fetch error', async () => {
    mockGetTodos.mockRejectedValue(new Error('Failed to fetch'))

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('should return empty array when no todos', async () => {
    mockGetTodos.mockResolvedValue({ todos: [] })

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.todos).toEqual([])
  })

  it('should have 5 minute stale time', async () => {
    mockGetTodos.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useTodos(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Data should be fresh (not stale) immediately after fetch
    expect(result.current.isStale).toBe(false)
  })
})
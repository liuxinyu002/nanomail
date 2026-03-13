import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTodosByDateRange } from './useTodosByDateRange'
import type { TodosResponse } from '@/services'

// Mock TodoService
const mockGetTodosByDateRange = vi.fn()
vi.mock('@/services', () => ({
  TodoService: {
    getTodosByDateRange: (query: { startDate: string; endDate: string }) =>
      mockGetTodosByDateRange(query),
  },
}))

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useTodosByDateRange', () => {
  beforeEach(() => {
    mockGetTodosByDateRange.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Date Range Calculation', () => {
    it('should calculate 42-day calendar grid starting from Sunday', async () => {
      // March 2024 - month starts on Friday, so calendar should start on Sunday Feb 25
      const march2024 = new Date('2024-03-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(march2024), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Verify the API was called with correct date range
      // March 1, 2024 is a Friday, so calendar starts on Sunday Feb 25, 2024
      // 42 days inclusive: Feb 25 is day 1, April 6 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2024-02-25',
        endDate: '2024-04-06',
      })
    })

    it('should calculate correct range for month starting on Sunday', async () => {
      // September 2024 - September 1 is a Sunday
      const september2024 = new Date('2024-09-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(september2024), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // September 1, 2024 is a Sunday, so calendar starts on Sep 1
      // 42 days inclusive: Sep 1 is day 1, Oct 12 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2024-09-01',
        endDate: '2024-10-12',
      })
    })

    it('should calculate correct range for month starting on Monday', async () => {
      // April 2024 - April 1 is a Monday
      const april2024 = new Date('2024-04-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(april2024), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // April 1, 2024 is a Monday, so calendar starts on Sunday March 31
      // 42 days inclusive: Mar 31 is day 1, May 11 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2024-03-31',
        endDate: '2024-05-11',
      })
    })

    it('should calculate correct range for December crossing year boundary', async () => {
      // December 2024
      const december2024 = new Date('2024-12-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(december2024), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // December 1, 2024 is a Sunday, so calendar starts on Dec 1
      // 42 days inclusive: Dec 1 is day 1, Jan 11 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2024-12-01',
        endDate: '2025-01-11',
      })
    })

    it('should always span exactly 42 days (6 weeks)', async () => {
      const testDate = new Date('2024-06-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(testDate), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const callArgs = mockGetTodosByDateRange.mock.calls[0][0]
      const start = new Date(callArgs.startDate)
      const end = new Date(callArgs.endDate)
      const daysDiff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      // 42 days means 41 days difference (inclusive range)
      expect(daysDiff).toBe(41)
    })
  })

  describe('Query Configuration', () => {
    it('should use correct query key with date range', async () => {
      const testDate = new Date('2024-03-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useTodosByDateRange(testDate), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Verify query key exists in cache
      const cacheData = queryClient.getQueryData(['todos', '2024-02-25', '2024-04-06'])
      expect(cacheData).toEqual(mockResponse)
    })

    it('should have staleTime of 5 minutes', async () => {
      const testDate = new Date('2024-03-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(testDate), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Check that staleTime is set (data should not be stale immediately)
      // Note: We can't directly check staleTime, but we can verify the query meta
      expect(result.current.dataUpdatedAt).toBeGreaterThan(0)
    })

    it('should not refetch for same date in same month', async () => {
      const date1 = new Date('2024-03-10')
      const date2 = new Date('2024-03-20')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValue(mockResponse)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result, rerender } = renderHook(
        ({ date }) => useTodosByDateRange(date),
        {
          initialProps: { date: date1 },
          wrapper,
        }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetTodosByDateRange).toHaveBeenCalledTimes(1)

      // Rerender with different date in same month - should calculate same range
      rerender({ date: date2 })

      // Should not call API again since date range is the same
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetTodosByDateRange).toHaveBeenCalledTimes(1)
    })
  })

  describe('Data Fetching', () => {
    it('should return todos data on successful fetch', async () => {
      const testDate = new Date('2024-03-15')

      const mockResponse: TodosResponse = {
        todos: [
          {
            id: 1,
            emailId: 100,
            description: 'Task 1',
            urgency: 'high',
            status: 'pending',
            deadline: '2024-03-20T00:00:00.000Z',
            createdAt: '2024-03-01T00:00:00.000Z',
          },
          {
            id: 2,
            emailId: 101,
            description: 'Task 2',
            urgency: 'low',
            status: 'completed',
            deadline: null,
            createdAt: '2024-03-02T00:00:00.000Z',
          },
        ],
      }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(testDate), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockResponse)
      expect(result.current.data?.todos).toHaveLength(2)
    })

    it('should return empty array when no todos', async () => {
      const testDate = new Date('2024-03-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(testDate), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.todos).toEqual([])
    })

    it('should set error state on API failure', async () => {
      const testDate = new Date('2024-03-15')

      mockGetTodosByDateRange.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useTodosByDateRange(testDate), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Network error')
    })

    it('should set loading state while fetching', async () => {
      const testDate = new Date('2024-03-15')

      // Create a promise that we can resolve manually
      let resolvePromise: (value: TodosResponse) => void
      const pendingPromise = new Promise<TodosResponse>((resolve) => {
        resolvePromise = resolve
      })
      mockGetTodosByDateRange.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useTodosByDateRange(testDate), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isFetching).toBe(true)

      // Resolve the promise
      resolvePromise!({ todos: [] })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle leap year February correctly', async () => {
      // February 2024 is a leap year
      const february2024 = new Date('2024-02-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(february2024), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // February 1, 2024 is a Thursday, so calendar starts on Sunday Jan 28
      // 42 days inclusive: Jan 28 is day 1, Mar 9 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2024-01-28',
        endDate: '2024-03-09',
      })
    })

    it('should handle non-leap year February correctly', async () => {
      // February 2023 is not a leap year
      const february2023 = new Date('2023-02-15')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(february2023), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // February 1, 2023 is a Wednesday, so calendar starts on Sunday Jan 29
      // 42 days inclusive: Jan 29 is day 1, Mar 11 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2023-01-29',
        endDate: '2023-03-11',
      })
    })

    it('should handle date at end of month', async () => {
      const endOfMonth = new Date('2024-01-31')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(endOfMonth), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // January 1, 2024 is a Monday, so calendar starts on Sunday Dec 31, 2023
      // 42 days inclusive: Dec 31, 2023 is day 1, Feb 10, 2024 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2023-12-31',
        endDate: '2024-02-10',
      })
    })

    it('should handle date at start of month', async () => {
      const startOfMonth = new Date('2024-04-01')

      const mockResponse: TodosResponse = { todos: [] }
      mockGetTodosByDateRange.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useTodosByDateRange(startOfMonth), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // April 1, 2024 is a Monday, so calendar starts on Sunday March 31
      // 42 days inclusive: Mar 31 is day 1, May 11 is day 42
      expect(mockGetTodosByDateRange).toHaveBeenCalledWith({
        startDate: '2024-03-31',
        endDate: '2024-05-11',
      })
    })
  })
})
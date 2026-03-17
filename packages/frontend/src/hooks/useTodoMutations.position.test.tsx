/**
 * Tests for useUpdateTodoPositionMutation and useBatchUpdatePositionsMutation hooks
 *
 * Tests the optimistic update pattern with:
 * - Instant local UI update (setQueryData)
 * - Async mutation to backend
 * - Rollback on error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUpdateTodoPositionMutation, useBatchUpdatePositionsMutation } from './useTodoMutations.position'
import type { TodoItem } from '@/services'
import type { UpdateTodoPosition } from '@nanomail/shared'

// Mock the TodoService
vi.mock('@/services', () => ({
  TodoService: {
    updateTodoPosition: vi.fn(),
    batchUpdatePositions: vi.fn(),
  },
}))

import { TodoService } from '@/services'

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useUpdateTodoPositionMutation', () => {
  const mockTodo: TodoItem = {
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
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call TodoService.updateTodoPosition with correct parameters', async () => {
    const { wrapper, queryClient } = createWrapper()
    const mockResponse = { ...mockTodo, boardColumnId: 2, position: 500 }
    vi.mocked(TodoService.updateTodoPosition).mockResolvedValueOnce(mockResponse)

    // Pre-populate cache
    queryClient.setQueryData(['todos'], { todos: [mockTodo] })

    const { result } = renderHook(() => useUpdateTodoPositionMutation(), { wrapper })

    const updateData: UpdateTodoPosition = { boardColumnId: 2, position: 500 }

    act(() => {
      result.current.mutate({ id: 1, data: updateData })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(TodoService.updateTodoPosition).toHaveBeenCalledWith(1, updateData)
  })

  it('should optimistically update the todo in cache', async () => {
    const { wrapper, queryClient } = createWrapper()

    // Pre-populate cache
    queryClient.setQueryData(['todos'], { todos: [mockTodo] })

    vi.mocked(TodoService.updateTodoPosition).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ...mockTodo, boardColumnId: 2 }), 100))
    )

    const { result } = renderHook(() => useUpdateTodoPositionMutation(), { wrapper })

    const updateData: UpdateTodoPosition = { boardColumnId: 2, position: 500 }

    act(() => {
      result.current.mutate({ id: 1, data: updateData })
    })

    // Wait for the mutation to be in progress (optimistic update happens in onMutate)
    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    // Now check the optimistic update - cache should be updated immediately
    const cachedData = queryClient.getQueryData<{ todos: TodoItem[] }>(['todos'])
    expect(cachedData?.todos[0].boardColumnId).toBe(2)
    expect(cachedData?.todos[0].position).toBe(500)
  })

  it('should rollback on error', async () => {
    const { wrapper, queryClient } = createWrapper()

    // Pre-populate cache
    queryClient.setQueryData(['todos'], { todos: [mockTodo] })

    vi.mocked(TodoService.updateTodoPosition).mockRejectedValueOnce(
      new Error('Network error')
    )

    const { result } = renderHook(() => useUpdateTodoPositionMutation(), { wrapper })

    const updateData: UpdateTodoPosition = { boardColumnId: 2, position: 500 }

    act(() => {
      result.current.mutate({ id: 1, data: updateData })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Cache should be rolled back to original state
    const cachedData = queryClient.getQueryData<{ todos: TodoItem[] }>(['todos'])
    expect(cachedData?.todos[0].boardColumnId).toBe(1)
    expect(cachedData?.todos[0].position).toBe(100)
  })

  it('should invalidate queries after success', async () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Pre-populate cache
    queryClient.setQueryData(['todos'], { todos: [mockTodo] })

    vi.mocked(TodoService.updateTodoPosition).mockResolvedValueOnce({
      ...mockTodo,
      boardColumnId: 2,
    })

    const { result } = renderHook(() => useUpdateTodoPositionMutation(), { wrapper })

    act(() => {
      result.current.mutate({ id: 1, data: { boardColumnId: 2 } })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] })
  })

  it('should handle multiple todo queries (different cache keys)', async () => {
    const { wrapper, queryClient } = createWrapper()

    // Populate multiple queries
    queryClient.setQueryData(['todos'], { todos: [mockTodo] })
    queryClient.setQueryData(['todos', { boardColumnId: 1 }], { todos: [mockTodo] })

    vi.mocked(TodoService.updateTodoPosition).mockResolvedValueOnce({
      ...mockTodo,
      boardColumnId: 2,
    })

    const { result } = renderHook(() => useUpdateTodoPositionMutation(), { wrapper })

    act(() => {
      result.current.mutate({ id: 1, data: { boardColumnId: 2 } })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Both caches should be updated
    expect(
      queryClient.getQueryData<{ todos: TodoItem[] }>(['todos'])?.todos[0].boardColumnId
    ).toBe(2)
    expect(
      queryClient.getQueryData<{ todos: TodoItem[] }>(['todos', { boardColumnId: 1 }])?.todos[0].boardColumnId
    ).toBe(2)
  })

  it('should handle deadline update', async () => {
    const { wrapper, queryClient } = createWrapper()

    queryClient.setQueryData(['todos'], { todos: [mockTodo] })

    vi.mocked(TodoService.updateTodoPosition).mockResolvedValueOnce({
      ...mockTodo,
      deadline: '2024-02-15T00:00:00.000Z',
    })

    const { result } = renderHook(() => useUpdateTodoPositionMutation(), { wrapper })

    const updateData: UpdateTodoPosition = {
      boardColumnId: 1,
      deadline: '2024-02-15T00:00:00.000Z',
    }

    act(() => {
      result.current.mutate({ id: 1, data: updateData })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(TodoService.updateTodoPosition).toHaveBeenCalledWith(1, updateData)
  })
})

describe('useBatchUpdatePositionsMutation', () => {
  const mockTodos: TodoItem[] = [
    { id: 1, emailId: 1, description: 'Todo 1', status: 'pending', deadline: null, boardColumnId: 1, position: 100, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 2, emailId: 1, description: 'Todo 2', status: 'pending', deadline: null, boardColumnId: 1, position: 200, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 3, emailId: 1, description: 'Todo 3', status: 'pending', deadline: null, boardColumnId: 2, position: 300, createdAt: '2024-01-01T00:00:00.000Z' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call TodoService.batchUpdatePositions with correct parameters', async () => {
    const { wrapper } = createWrapper()

    vi.mocked(TodoService.batchUpdatePositions).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useBatchUpdatePositionsMutation(), { wrapper })

    const updates = [
      { id: 1, boardColumnId: 2, position: 100 },
      { id: 2, boardColumnId: 2, position: 200 },
    ]

    act(() => {
      result.current.mutate(updates)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(TodoService.batchUpdatePositions).toHaveBeenCalledWith(updates)
  })

  it('should invalidate queries after success', async () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    vi.mocked(TodoService.batchUpdatePositions).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useBatchUpdatePositionsMutation(), { wrapper })

    act(() => {
      result.current.mutate([{ id: 1, boardColumnId: 2, position: 100 }])
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] })
  })

  it('should handle error', async () => {
    const { wrapper, queryClient } = createWrapper()

    // Pre-populate cache
    queryClient.setQueryData(['todos'], { todos: mockTodos })

    vi.mocked(TodoService.batchUpdatePositions).mockRejectedValueOnce(
      new Error('Batch update failed')
    )

    const { result } = renderHook(() => useBatchUpdatePositionsMutation(), { wrapper })

    act(() => {
      result.current.mutate([{ id: 1, boardColumnId: 2, position: 100 }])
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('should handle empty updates array', async () => {
    const { wrapper } = createWrapper()

    vi.mocked(TodoService.batchUpdatePositions).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useBatchUpdatePositionsMutation(), { wrapper })

    act(() => {
      result.current.mutate([])
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(TodoService.batchUpdatePositions).toHaveBeenCalledWith([])
  })

  it('should handle large batch updates', async () => {
    const { wrapper } = createWrapper()

    vi.mocked(TodoService.batchUpdatePositions).mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useBatchUpdatePositionsMutation(), { wrapper })

    const updates = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      boardColumnId: 1,
      position: (i + 1) * 100,
    }))

    act(() => {
      result.current.mutate(updates)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(TodoService.batchUpdatePositions).toHaveBeenCalledWith(updates)
  })

  it('should handle pending state during mutation', async () => {
    const { wrapper } = createWrapper()

    // Create a promise that we can control
    let resolvePromise: () => void
    const pendingPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(TodoService.batchUpdatePositions).mockReturnValueOnce(pendingPromise as Promise<void>)

    const { result } = renderHook(() => useBatchUpdatePositionsMutation(), { wrapper })

    act(() => {
      result.current.mutate([{ id: 1, boardColumnId: 2, position: 100 }])
    })

    // Wait for the mutation to be in pending state
    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    // Resolve the promise to complete the mutation
    resolvePromise!()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
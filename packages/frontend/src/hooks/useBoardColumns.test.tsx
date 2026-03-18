/**
 * Tests for useBoardColumns hooks
 *
 * Tests React Query hooks for board column operations:
 * - useBoardColumns: Fetch all columns
 * - useCreateBoardColumnMutation: Create new column
 * - useUpdateBoardColumnMutation: Update column
 * - useDeleteBoardColumnMutation: Delete column
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { BoardColumn, CreateBoardColumn, UpdateBoardColumn } from '@nanomail/shared'
import {
  useBoardColumns,
  useCreateBoardColumnMutation,
  useUpdateBoardColumnMutation,
  useDeleteBoardColumnMutation,
} from './useBoardColumns'

// Mock the BoardColumnService
vi.mock('@/services', () => ({
  BoardColumnService: {
    getBoardColumns: vi.fn(),
    createBoardColumn: vi.fn(),
    updateBoardColumn: vi.fn(),
    deleteBoardColumn: vi.fn(),
  },
}))

import { BoardColumnService } from '@/services'

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

describe('useBoardColumns', () => {
  const mockColumns: BoardColumn[] = [
    {
      id: 1,
      name: 'Inbox',
      color: '#3498db',
      order: 0,
      isSystem: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    {
      id: 2,
      name: 'Todo',
      color: '#9b59b6',
      order: 1,
      isSystem: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should fetch board columns successfully', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.getBoardColumns).mockResolvedValueOnce(mockColumns)

    const { result } = renderHook(() => useBoardColumns(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockColumns)
    expect(BoardColumnService.getBoardColumns).toHaveBeenCalledTimes(1)
  })

  it('should use correct query key', async () => {
    const { wrapper, queryClient } = createWrapper()
    vi.mocked(BoardColumnService.getBoardColumns).mockResolvedValueOnce(mockColumns)

    renderHook(() => useBoardColumns(), { wrapper })

    await waitFor(() => {
      expect(queryClient.getQueryData(['boardColumns'])).toBeDefined()
    })
  })

  it('should handle loading state', () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.getBoardColumns).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    const { result } = renderHook(() => useBoardColumns(), { wrapper })

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle error state', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.getBoardColumns).mockRejectedValueOnce(
      new Error('Failed to fetch')
    )

    const { result } = renderHook(() => useBoardColumns(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('should return empty array when no columns', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.getBoardColumns).mockResolvedValueOnce([])

    const { result } = renderHook(() => useBoardColumns(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('should refetch when invalidateQueries is called', async () => {
    const { wrapper, queryClient } = createWrapper()
    vi.mocked(BoardColumnService.getBoardColumns).mockResolvedValueOnce(mockColumns)

    renderHook(() => useBoardColumns(), { wrapper })

    await waitFor(() => {
      expect(BoardColumnService.getBoardColumns).toHaveBeenCalledTimes(1)
    })

    // Invalidate and refetch
    vi.mocked(BoardColumnService.getBoardColumns).mockResolvedValueOnce(mockColumns)
    await queryClient.invalidateQueries({ queryKey: ['boardColumns'] })

    await waitFor(() => {
      expect(BoardColumnService.getBoardColumns).toHaveBeenCalledTimes(2)
    })
  })
})

describe('useCreateBoardColumnMutation', () => {
  const newColumn: BoardColumn = {
    id: 3,
    name: 'Review',
    color: '#f39c12',
    order: 2,
    isSystem: false,
    createdAt: new Date('2024-01-15T00:00:00.000Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create board column successfully', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.createBoardColumn).mockResolvedValueOnce(newColumn)

    const { result } = renderHook(() => useCreateBoardColumnMutation(), { wrapper })

    const createData: CreateBoardColumn = {
      name: 'Review',
      color: '#f39c12',
      order: 2,
    }

    act(() => {
      result.current.mutate(createData)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(BoardColumnService.createBoardColumn).toHaveBeenCalledWith(createData)
    expect(result.current.data).toEqual(newColumn)
  })

  it('should invalidate queries after success', async () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    vi.mocked(BoardColumnService.createBoardColumn).mockResolvedValueOnce(newColumn)

    const { result } = renderHook(() => useCreateBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate({ name: 'Review', order: 2 })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['boardColumns'] })
  })

  it('should handle error', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.createBoardColumn).mockRejectedValueOnce(
      new Error('Failed to create')
    )

    const { result } = renderHook(() => useCreateBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate({ name: 'Test', order: 0 })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('should handle pending state', async () => {
    const { wrapper } = createWrapper()

    // Create a promise that we can control
    let resolvePromise: (value: BoardColumn) => void
    const pendingPromise = new Promise<BoardColumn>((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(BoardColumnService.createBoardColumn).mockReturnValueOnce(pendingPromise)

    const { result } = renderHook(() => useCreateBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate({ name: 'Review', order: 2 })
    })

    // Wait for the mutation to be in pending state
    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    // Resolve the promise to complete the mutation
    resolvePromise!(newColumn)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})

describe('useUpdateBoardColumnMutation', () => {
  const updatedColumn: BoardColumn = {
    id: 2,
    name: 'Updated Name',
    color: '#9b59b6',
    order: 1,
    isSystem: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should update board column successfully', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.updateBoardColumn).mockResolvedValueOnce(updatedColumn)

    const { result } = renderHook(() => useUpdateBoardColumnMutation(), { wrapper })

    const updateData: UpdateBoardColumn = {
      name: 'Updated Name',
    }

    act(() => {
      result.current.mutate({ id: 2, data: updateData })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(BoardColumnService.updateBoardColumn).toHaveBeenCalledWith(2, updateData)
    expect(result.current.data).toEqual(updatedColumn)
  })

  it('should invalidate queries after success', async () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    vi.mocked(BoardColumnService.updateBoardColumn).mockResolvedValueOnce(updatedColumn)

    const { result } = renderHook(() => useUpdateBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate({ id: 2, data: { name: 'Updated' } })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['boardColumns'] })
  })

  it('should handle error when updating system column', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.updateBoardColumn).mockRejectedValueOnce(
      new Error('Cannot modify system column')
    )

    const { result } = renderHook(() => useUpdateBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate({ id: 1, data: { name: 'New Name' } })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('should handle error for non-existent column', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.updateBoardColumn).mockRejectedValueOnce(
      new Error('Column not found')
    )

    const { result } = renderHook(() => useUpdateBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate({ id: 999, data: { name: 'Test' } })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('should update multiple fields', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.updateBoardColumn).mockResolvedValueOnce(updatedColumn)

    const { result } = renderHook(() => useUpdateBoardColumnMutation(), { wrapper })

    const updateData: UpdateBoardColumn = {
      name: 'Updated Name',
      color: '#ff0000',
      order: 3,
    }

    act(() => {
      result.current.mutate({ id: 2, data: updateData })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(BoardColumnService.updateBoardColumn).toHaveBeenCalledWith(2, updateData)
  })
})

describe('useDeleteBoardColumnMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should delete board column successfully and return moved tasks count', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.deleteBoardColumn).mockResolvedValueOnce({
      message: 'Column deleted',
      movedTasks: 3,
    })

    const { result } = renderHook(() => useDeleteBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate(2)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(BoardColumnService.deleteBoardColumn).toHaveBeenCalledWith(2)
    expect(result.current.data?.movedTasks).toBe(3)
  })

  it('should invalidate queries after success', async () => {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    vi.mocked(BoardColumnService.deleteBoardColumn).mockResolvedValueOnce({
      message: 'Column deleted',
      movedTasks: 0,
    })

    const { result } = renderHook(() => useDeleteBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate(2)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['boardColumns'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] })
  })

  it('should handle error when deleting system column', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.deleteBoardColumn).mockRejectedValueOnce(
      new Error('Cannot delete system column')
    )

    const { result } = renderHook(() => useDeleteBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate(1)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Cannot delete system column')
  })

  it('should handle error for non-existent column', async () => {
    const { wrapper } = createWrapper()
    vi.mocked(BoardColumnService.deleteBoardColumn).mockRejectedValueOnce(
      new Error('Column not found')
    )

    const { result } = renderHook(() => useDeleteBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate(999)
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('should handle pending state', async () => {
    const { wrapper } = createWrapper()

    // Create a promise that we can control
    let resolvePromise: (value: { message: string; movedTasks: number }) => void
    const pendingPromise = new Promise<{ message: string; movedTasks: number }>((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(BoardColumnService.deleteBoardColumn).mockReturnValueOnce(pendingPromise)

    const { result } = renderHook(() => useDeleteBoardColumnMutation(), { wrapper })

    act(() => {
      result.current.mutate(2)
    })

    // Wait for the mutation to be in pending state
    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    // Resolve the promise to complete the mutation
    resolvePromise!({ message: 'Column deleted', movedTasks: 0 })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })
})
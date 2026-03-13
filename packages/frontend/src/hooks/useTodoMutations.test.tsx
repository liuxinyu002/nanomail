import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUpdateTodoMutation, useDeleteTodoMutation } from './useTodoMutations'
import type { TodosResponse, TodoItem } from '@/services'

// Mock TodoService
const mockUpdateTodo = vi.fn()
const mockDeleteTodo = vi.fn()
vi.mock('@/services', () => ({
  TodoService: {
    updateTodo: (id: number, data: unknown) => mockUpdateTodo(id, data),
    deleteTodo: (id: number) => mockDeleteTodo(id),
  },
}))

// Helper to create wrapper with QueryClient
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 5 * 60 * 1000, // 5 minutes - prevent immediate garbage collection
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient = createQueryClient()) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

// Mock todo data
const mockTodo1: TodoItem = {
  id: 1,
  emailId: 100,
  description: 'Review the report',
  urgency: 'high',
  status: 'pending',
  deadline: '2024-03-20T00:00:00.000Z',
  createdAt: '2024-03-01T00:00:00.000Z',
}

const mockTodo2: TodoItem = {
  id: 2,
  emailId: 101,
  description: 'Send email',
  urgency: 'medium',
  status: 'in_progress',
  deadline: null,
  createdAt: '2024-03-02T00:00:00.000Z',
}

const mockTodo3: TodoItem = {
  id: 3,
  emailId: 102,
  description: 'Call client',
  urgency: 'low',
  status: 'completed',
  deadline: '2024-03-15T00:00:00.000Z',
  createdAt: '2024-03-03T00:00:00.000Z',
}

describe('useTodoMutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createQueryClient()
    mockUpdateTodo.mockReset()
    mockDeleteTodo.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('useUpdateTodoMutation', () => {
    describe('Optimistic Update', () => {
      it('should update todo in cache immediately (optimistically)', async () => {
        // Set up initial cache data
        const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        // Use a pending promise to ensure the API doesn't resolve during test
        let resolveApi: (value: TodoItem) => void
        mockUpdateTodo.mockReturnValue(
          new Promise((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        // Trigger mutation
        act(() => {
          result.current.mutate({
            id: 1,
            data: { description: 'Updated description' },
          })
        })

        // Wait for optimistic update to happen (onMutate is async)
        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos[0].description).toBe('Updated description')
        })

        // Mutation should still be pending (API not resolved)
        expect(result.current.isPending).toBe(true)

        // Clean up - resolve the API
        resolveApi!({ ...mockTodo1, description: 'Updated description' })
      })

      it('should update urgency optimistically', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: (value: TodoItem) => void
        mockUpdateTodo.mockReturnValue(
          new Promise((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { urgency: 'low' },
          })
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos[0].urgency).toBe('low')
        })

        expect(result.current.isPending).toBe(true)
        resolveApi!({ ...mockTodo1, urgency: 'low' })
      })

      it('should update status optimistically', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: (value: TodoItem) => void
        mockUpdateTodo.mockReturnValue(
          new Promise((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { status: 'completed' },
          })
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos[0].status).toBe('completed')
        })

        expect(result.current.isPending).toBe(true)
        resolveApi!({ ...mockTodo1, status: 'completed' })
      })

      it('should update deadline optimistically', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: (value: TodoItem) => void
        const newDeadline = '2024-04-01T00:00:00.000Z'
        mockUpdateTodo.mockReturnValue(
          new Promise((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { deadline: newDeadline },
          })
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos[0].deadline).toBe(newDeadline)
        })

        expect(result.current.isPending).toBe(true)
        resolveApi!({ ...mockTodo1, deadline: newDeadline })
      })

      it('should clear deadline by setting null optimistically', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: (value: TodoItem) => void
        mockUpdateTodo.mockReturnValue(
          new Promise((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { deadline: null },
          })
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos[0].deadline).toBeNull()
        })

        expect(result.current.isPending).toBe(true)
        resolveApi!({ ...mockTodo1, deadline: null })
      })
    })

    describe('Rollback on Error', () => {
      it('should rollback to previous data on API failure', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockUpdateTodo.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { description: 'Updated description' },
          })
        })

        // Wait for error to be handled
        await waitFor(() => expect(result.current.isError).toBe(true))

        // Check that data was rolled back
        const cachedData = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-01',
          '2024-03-31',
        ])
        expect(cachedData?.todos[0].description).toBe('Review the report')
      })

      it('should rollback all fields on error', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockUpdateTodo.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: {
              description: 'Changed',
              urgency: 'low',
              status: 'completed',
              deadline: null,
            },
          })
        })

        await waitFor(() => expect(result.current.isError).toBe(true))

        const cachedData = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-01',
          '2024-03-31',
        ])
        // All fields should be rolled back to original values
        expect(cachedData?.todos[0]).toEqual(mockTodo1)
      })
    })

    describe('Query Invalidation', () => {
      it('should invalidate todos queries after successful mutation', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        const mockUpdatedTodo = { ...mockTodo1, description: 'Updated' }
        mockUpdateTodo.mockResolvedValueOnce(mockUpdatedTodo)

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { description: 'Updated' },
          })
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] })
      })

      it('should invalidate queries even on error', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockUpdateTodo.mockRejectedValueOnce(new Error('Network error'))

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { description: 'Updated' },
          })
        })

        await waitFor(() => expect(result.current.isError).toBe(true))

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] })
      })
    })

    describe('Multiple Query Keys', () => {
      it('should update all todo queries with matching todo id', async () => {
        // Set up multiple queries with the same todo
        const query1Data: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        const query2Data: TodosResponse = { todos: [mockTodo1, mockTodo3] }

        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-15'], query1Data)
        queryClient.setQueryData(['todos', '2024-03-16', '2024-03-31'], query2Data)

        let resolveApi: (value: TodoItem) => void
        mockUpdateTodo.mockReturnValue(
          new Promise((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { description: 'Updated' },
          })
        })

        // Wait for both queries to be updated
        await waitFor(() => {
          const data1 = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-15',
          ])
          const data2 = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-16',
            '2024-03-31',
          ])
          expect(data1?.todos[0].description).toBe('Updated')
          expect(data2?.todos[0].description).toBe('Updated')
        })

        resolveApi!({ ...mockTodo1, description: 'Updated' })
      })

      it('should rollback ALL todo queries on API failure', async () => {
        // Set up multiple queries with different data
        const query1Data: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        const query2Data: TodosResponse = { todos: [mockTodo1, mockTodo3] }
        const originalQuery1Data = JSON.parse(JSON.stringify(query1Data))
        const originalQuery2Data = JSON.parse(JSON.stringify(query2Data))

        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-15'], query1Data)
        queryClient.setQueryData(['todos', '2024-03-16', '2024-03-31'], query2Data)

        mockUpdateTodo.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { description: 'Should rollback' },
          })
        })

        // Wait for mutation to fail
        await waitFor(() => expect(result.current.isError).toBe(true))

        // Verify BOTH queries are rolled back to original state
        const data1 = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-01',
          '2024-03-15',
        ])
        const data2 = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-16',
          '2024-03-31',
        ])

        expect(data1?.todos).toEqual(originalQuery1Data.todos)
        expect(data2?.todos).toEqual(originalQuery2Data.todos)
      })
    })

    describe('Edge Cases', () => {
      it('should handle update of non-existent todo gracefully', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockUpdateTodo.mockRejectedValueOnce(new Error('Todo not found'))

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 999,
            data: { description: 'Updated' },
          })
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error).toBeInstanceOf(Error)
      })

      it('should handle empty cache gracefully', async () => {
        mockUpdateTodo.mockResolvedValueOnce(mockTodo1)

        const { result } = renderHook(() => useUpdateTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate({
            id: 1,
            data: { description: 'Updated' },
          })
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        // Should not throw and should complete successfully
      })
    })
  })

  describe('useDeleteTodoMutation', () => {
    describe('Optimistic Delete', () => {
      it('should remove todo from cache immediately (optimistically)', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2, mockTodo3] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: () => void
        mockDeleteTodo.mockReturnValue(
          new Promise<void>((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(2)
        })

        // Wait for optimistic update
        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos).toHaveLength(2)
          expect(cachedData?.todos.find((t) => t.id === 2)).toBeUndefined()
        })

        expect(result.current.isPending).toBe(true)
        resolveApi!()
      })

      it('should maintain order of remaining todos after delete', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2, mockTodo3] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: () => void
        mockDeleteTodo.mockReturnValue(
          new Promise<void>((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(2) // Delete middle item
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos[0].id).toBe(1)
          expect(cachedData?.todos[1].id).toBe(3)
        })

        resolveApi!()
      })

      it('should handle delete of first item in list', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: () => void
        mockDeleteTodo.mockReturnValue(
          new Promise<void>((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos).toHaveLength(1)
          expect(cachedData?.todos[0].id).toBe(2)
        })

        resolveApi!()
      })

      it('should handle delete of last item in list', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: () => void
        mockDeleteTodo.mockReturnValue(
          new Promise<void>((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(2)
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos).toHaveLength(1)
          expect(cachedData?.todos[0].id).toBe(1)
        })

        resolveApi!()
      })

      it('should leave empty array when deleting last todo', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        let resolveApi: () => void
        mockDeleteTodo.mockReturnValue(
          new Promise<void>((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        await waitFor(() => {
          const cachedData = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-31',
          ])
          expect(cachedData?.todos).toEqual([])
        })

        resolveApi!()
      })
    })

    describe('Rollback on Error', () => {
      it('should rollback to previous data on API failure', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockDeleteTodo.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        await waitFor(() => expect(result.current.isError).toBe(true))

        const cachedData = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-01',
          '2024-03-31',
        ])

        // Should have rolled back to original 2 todos
        expect(cachedData?.todos).toHaveLength(2)
        expect(cachedData?.todos[0]).toEqual(mockTodo1)
      })

      it('should restore deleted todo at correct position on rollback', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2, mockTodo3] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockDeleteTodo.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(2) // Delete middle item
        })

        await waitFor(() => expect(result.current.isError).toBe(true))

        const cachedData = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-01',
          '2024-03-31',
        ])

        // Should have all 3 todos in original order
        expect(cachedData?.todos).toHaveLength(3)
        expect(cachedData?.todos).toEqual([mockTodo1, mockTodo2, mockTodo3])
      })
    })

    describe('Query Invalidation', () => {
      it('should invalidate todos queries after successful delete', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockDeleteTodo.mockResolvedValueOnce(undefined)

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] })
      })

      it('should invalidate queries even on error', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockDeleteTodo.mockRejectedValueOnce(new Error('Network error'))

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        await waitFor(() => expect(result.current.isError).toBe(true))

        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] })
      })
    })

    describe('Multiple Query Keys', () => {
      it('should remove todo from all todo queries', async () => {
        const query1Data: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        const query2Data: TodosResponse = { todos: [mockTodo1, mockTodo3] }

        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-15'], query1Data)
        queryClient.setQueryData(['todos', '2024-03-16', '2024-03-31'], query2Data)

        let resolveApi: () => void
        mockDeleteTodo.mockReturnValue(
          new Promise<void>((resolve) => {
            resolveApi = resolve
          })
        )

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        await waitFor(() => {
          const data1 = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-01',
            '2024-03-15',
          ])
          const data2 = queryClient.getQueryData<TodosResponse>([
            'todos',
            '2024-03-16',
            '2024-03-31',
          ])

          // Todo 1 should be removed from both queries
          expect(data1?.todos.find((t) => t.id === 1)).toBeUndefined()
          expect(data2?.todos.find((t) => t.id === 1)).toBeUndefined()
        })

        resolveApi!()
      })

      it('should rollback ALL todo queries on API failure', async () => {
        // Set up multiple queries with different data
        const query1Data: TodosResponse = { todos: [mockTodo1, mockTodo2] }
        const query2Data: TodosResponse = { todos: [mockTodo1, mockTodo3] }
        const originalQuery1Data = JSON.parse(JSON.stringify(query1Data))
        const originalQuery2Data = JSON.parse(JSON.stringify(query2Data))

        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-15'], query1Data)
        queryClient.setQueryData(['todos', '2024-03-16', '2024-03-31'], query2Data)

        mockDeleteTodo.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        // Wait for mutation to fail
        await waitFor(() => expect(result.current.isError).toBe(true))

        // Verify BOTH queries are rolled back to original state
        const data1 = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-01',
          '2024-03-15',
        ])
        const data2 = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-16',
          '2024-03-31',
        ])

        expect(data1?.todos).toEqual(originalQuery1Data.todos)
        expect(data2?.todos).toEqual(originalQuery2Data.todos)
      })
    })

    describe('Edge Cases', () => {
      it('should handle delete of non-existent todo gracefully', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockDeleteTodo.mockRejectedValueOnce(new Error('Todo not found'))

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(999)
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error).toBeInstanceOf(Error)
      })

      it('should handle empty cache gracefully', async () => {
        mockDeleteTodo.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(1)
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        // Should not throw and should complete successfully
      })

      it('should handle deleting todo that is not in cache', async () => {
        const initialData: TodosResponse = { todos: [mockTodo1] }
        queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

        mockDeleteTodo.mockResolvedValueOnce(undefined)

        const { result } = renderHook(() => useDeleteTodoMutation(), {
          wrapper: createWrapper(queryClient),
        })

        act(() => {
          result.current.mutate(999) // Todo that doesn't exist in cache
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        // Cache should remain unchanged
        const cachedData = queryClient.getQueryData<TodosResponse>([
          'todos',
          '2024-03-01',
          '2024-03-31',
        ])
        expect(cachedData?.todos).toHaveLength(1)
        expect(cachedData?.todos[0]).toEqual(mockTodo1)
      })
    })
  })

  describe('Integration: Update and Delete Together', () => {
    it('should not interfere between update and delete mutations', async () => {
      const initialData: TodosResponse = { todos: [mockTodo1, mockTodo2] }
      queryClient.setQueryData(['todos', '2024-03-01', '2024-03-31'], initialData)

      mockUpdateTodo.mockResolvedValueOnce({ ...mockTodo1, description: 'Updated' })
      mockDeleteTodo.mockResolvedValueOnce(undefined)

      const { result: updateResult } = renderHook(() => useUpdateTodoMutation(), {
        wrapper: createWrapper(queryClient),
      })
      const { result: deleteResult } = renderHook(() => useDeleteTodoMutation(), {
        wrapper: createWrapper(queryClient),
      })

      // Update todo 1
      act(() => {
        updateResult.current.mutate({
          id: 1,
          data: { description: 'Updated' },
        })
      })

      // Delete todo 2
      act(() => {
        deleteResult.current.mutate(2)
      })

      await waitFor(() => {
        expect(updateResult.current.isSuccess).toBe(true)
        expect(deleteResult.current.isSuccess).toBe(true)
      })

      const cachedData = queryClient.getQueryData<TodosResponse>([
        'todos',
        '2024-03-01',
        '2024-03-31',
      ])

      // Should have 1 todo (todo 2 deleted), with updated description
      expect(cachedData?.todos).toHaveLength(1)
      expect(cachedData?.todos[0].id).toBe(1)
    })
  })
})
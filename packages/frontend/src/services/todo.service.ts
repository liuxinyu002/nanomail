/**
 * Todo Service
 * Handles API calls for todo operations
 */

import type { TodoStatus, TodoDateRangeQuery, UpdateTodo, UpdateTodoPosition, Todo } from '@nanomail/shared'

// Re-export types for convenience
export type { TodoStatus, TodoDateRangeQuery, UpdateTodo, UpdateTodoPosition, Todo } from '@nanomail/shared'

/**
 * @deprecated Use `Todo` from '@nanomail/shared' instead.
 * This alias is kept for backward compatibility with existing imports.
 * New code should import `Todo` directly from '@nanomail/shared'.
 */
export type TodoItem = Todo

export interface TodosResponse {
  todos: Todo[]
}

export interface TodosQuery {
  status?: TodoStatus
  boardColumnId?: number
  emailId?: number
}

/**
 * Todo Service - handles all todo-related API calls
 */
export const TodoService = {
  /**
   * Fetch todos with optional filters
   */
  async getTodos(query: TodosQuery = {}): Promise<TodosResponse> {
    const { status, boardColumnId, emailId } = query

    const params = new URLSearchParams()

    if (status) {
      params.set('status', status)
    }
    if (boardColumnId !== undefined) {
      params.set('boardColumnId', String(boardColumnId))
    }
    if (emailId !== undefined) {
      params.set('emailId', String(emailId))
    }

    const queryString = params.toString()
    const url = queryString ? `/api/todos?${queryString}` : '/api/todos'

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch todos')
    }

    return response.json()
  },

  /**
   * Update todo status
   */
  async updateTodoStatus(id: number, status: TodoStatus): Promise<TodoItem> {
    const response = await fetch(`/api/todos/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      throw new Error('Failed to update todo status')
    }

    return response.json()
  },

  /**
   * Fetch todos by date range
   */
  async getTodosByDateRange(query: TodoDateRangeQuery): Promise<TodosResponse> {
    const params = new URLSearchParams()
    params.set('startDate', query.startDate)
    params.set('endDate', query.endDate)

    const response = await fetch(`/api/todos?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Failed to fetch todos by date range')
    }

    return response.json()
  },

  /**
   * Update a todo item
   */
  async updateTodo(id: number, data: UpdateTodo): Promise<TodoItem> {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to update todo')
    }

    return response.json()
  },

  /**
   * Delete a todo item
   */
  async deleteTodo(id: number): Promise<void> {
    const response = await fetch(`/api/todos/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete todo')
    }
  },

  /**
   * Update todo position (for drag-and-drop)
   * Moves todo to a different column and/or position
   */
  async updateTodoPosition(id: number, data: UpdateTodoPosition): Promise<TodoItem> {
    const response = await fetch(`/api/todos/${id}/position`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to update todo position')
    }

    return response.json()
  },

  /**
   * Batch update todo positions (for rebalancing after drag-and-drop)
   * Updates multiple todos in a single request
   */
  async batchUpdatePositions(
    updates: Array<{ id: number; boardColumnId: number; position: number }>
  ): Promise<void> {
    const response = await fetch('/api/todos/batch-position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })

    if (!response.ok) {
      throw new Error('Failed to batch update positions')
    }
  },

  /**
   * Fetch todos by board column
   * Works for all columns including Inbox (column id 1)
   */
  async getTodosByColumn(columnId: number): Promise<TodosResponse> {
    const response = await fetch(`/api/todos?boardColumnId=${columnId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch todos by column')
    }

    return response.json()
  },
}

/**
 * Todo Service
 * Handles API calls for todo operations
 */

import type { TodoStatus, Urgency, TodoDateRangeQuery, UpdateTodo } from '@nanomail/shared'

// Re-export types for convenience
export type { TodoStatus, Urgency, TodoDateRangeQuery, UpdateTodo } from '@nanomail/shared'

export interface TodoItem {
  id: number
  emailId: number
  description: string
  urgency: Urgency
  status: TodoStatus
  deadline: string | null
  createdAt: string
}

export interface TodosResponse {
  todos: TodoItem[]
}

export interface TodosQuery {
  status?: TodoStatus
  urgency?: Urgency
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
    const { status, urgency, emailId } = query

    const params = new URLSearchParams()

    if (status) {
      params.set('status', status)
    }
    if (urgency) {
      params.set('urgency', urgency)
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
}

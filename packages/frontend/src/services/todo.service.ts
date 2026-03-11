/**
 * Todo Service
 * Handles API calls for todo operations
 */

import type { TodoStatus, Urgency } from '@nanomail/shared'

// Re-export types for convenience
export type { TodoStatus, Urgency } from '@nanomail/shared'

export interface TodoItem {
  id: number
  emailId: number
  description: string
  urgency: Urgency
  status: TodoStatus
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
}
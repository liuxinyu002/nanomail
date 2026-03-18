import { useCallback } from 'react'
import { TodoCard } from './TodoCard'
import type { TodoItem as TodoItemType } from '@/services'
import { useUpdateTodoMutation, useDeleteTodoMutation } from '@/hooks'

export interface TodoItemProps {
  todo: TodoItemType
  showDelete?: boolean
}

/**
 * TodoItem - A wrapper around TodoCard that handles data mutations
 *
 * This component:
 * - Wraps the new TodoCard component (Phase 7 migration)
 * - Handles toggle, delete, and other mutations
 * - Provides callback handlers for dropdown menu actions
 */
export function TodoItem({ todo, showDelete = false }: TodoItemProps) {
  const updateMutation = useUpdateTodoMutation()
  const deleteMutation = useDeleteTodoMutation()

  const isCompleted = todo.status === 'completed'

  const handleToggle = useCallback(() => {
    const newStatus = isCompleted ? 'pending' : 'completed'
    updateMutation.mutate({ id: todo.id, data: { status: newStatus } })
  }, [todo.id, isCompleted, updateMutation])

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(todo.id)
  }, [deleteMutation, todo.id])

  const handleEdit = useCallback(() => {
    // Placeholder - edit modal/form to be implemented in future phase
  }, [])

  return (
    <TodoCard
      todo={todo}
      onToggle={handleToggle}
      onEdit={handleEdit}
      onDelete={showDelete ? handleDelete : undefined}
    />
  )
}
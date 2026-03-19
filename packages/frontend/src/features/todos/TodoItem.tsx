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
 * - Handles toggle and delete mutations
 * - Provides callback handlers for delete action
 * - Handles save mutations for description, notes, and deadline
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

  // Save handlers for TaskDetailExpand fields
  const handleSaveDescription = useCallback((value: string) => {
    updateMutation.mutate({ id: todo.id, data: { description: value } })
  }, [todo.id, updateMutation])

  const handleSaveNotes = useCallback((value: string | null) => {
    updateMutation.mutate({ id: todo.id, data: { notes: value } })
  }, [todo.id, updateMutation])

  const handleSaveDeadline = useCallback((value: string | null) => {
    updateMutation.mutate({ id: todo.id, data: { deadline: value } })
  }, [todo.id, updateMutation])

  return (
    <TodoCard
      todo={todo}
      onToggle={handleToggle}
      onDelete={showDelete ? handleDelete : undefined}
      onSaveDescription={handleSaveDescription}
      onSaveNotes={handleSaveNotes}
      onSaveDeadline={handleSaveDeadline}
    />
  )
}
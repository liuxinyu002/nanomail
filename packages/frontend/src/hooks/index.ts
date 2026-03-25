/**
 * Hooks index - exports all custom hooks
 */

export { useTodosByDateRange } from './useTodosByDateRange'

export { useUpdateTodoMutation, useDeleteTodoMutation, useRestoreTodoMutation } from './useTodoMutations'

export { useUpdateTodoPositionMutation, useBatchUpdatePositionsMutation } from './useTodoMutations.position'

export { useTodos } from './useTodos'

export { useArchivedTodos, flattenArchivedTodos } from './useArchivedTodos'

export { useEmailDetail } from './useEmailDetail'

export { useSettings } from './useSettings'

export {
  useBoardColumns,
  useCreateBoardColumnMutation,
  useUpdateBoardColumnMutation,
  useDeleteBoardColumnMutation,
} from './useBoardColumns'

export { useChat, type UIMessage, type ToolCallStatus, type ChatState } from './useChat'
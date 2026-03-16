/**
 * Hooks index - exports all custom hooks
 */

export { useAgentDraft, useProcessEmails } from './useAgentDraft'
export type { SSEEvent, SSEEventType, UseAgentDraftReturn, ProcessEmailsResult, UseProcessEmailsReturn } from './useAgentDraft'

export { useAIAssistStream } from './useAIAssistStream'
export type { UseAIAssistStreamOptions, UseAIAssistStreamReturn, StreamingStatus } from './useAIAssistStream'

export { useTodosByDateRange } from './useTodosByDateRange'

export { useUpdateTodoMutation, useDeleteTodoMutation } from './useTodoMutations'

export { useTodos } from './useTodos'

export { useEmailDetail } from './useEmailDetail'

export { useSettings } from './useSettings'
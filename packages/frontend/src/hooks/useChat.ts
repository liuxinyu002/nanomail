import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useChatStore,
  syncMessagesToStorage,
  handleStorageEvent,
  setTodoToolSuccessCallback,
} from '@/stores/chatStore'

/**
 * useChat hook - thin wrapper around Zustand store
 *
 * Provides React integration for the global chat state:
 * - Syncs messages to localStorage on changes
 * - Handles cross-window storage events
 * - Manages todo query invalidation callback
 */
export function useChat() {
  const queryClient = useQueryClient()
  const store = useChatStore()

  // Set up todo invalidation callback
  useEffect(() => {
    setTodoToolSuccessCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    })

    return () => {
      setTodoToolSuccessCallback(null)
    }
  }, [queryClient])

  // Sync messages to localStorage when they change
  useEffect(() => {
    syncMessagesToStorage(store.messages)
  }, [store.messages])

  // Listen for storage events from other windows
  useEffect(() => {
    const onStorageEvent = (e: StorageEvent) => {
      handleStorageEvent(e, store.setMessages, store.setIsInputDisabled)
    }

    window.addEventListener('storage', onStorageEvent)
    return () => window.removeEventListener('storage', onStorageEvent)
  }, [store.setMessages, store.setIsInputDisabled])

  return {
    messages: store.messages,
    isStreaming: store.isStreaming,
    isInputDisabled: store.isInputDisabled,
    error: store.error,
    sendMessage: store.sendMessage,
    stopGeneration: store.stopGeneration,
    clearSession: store.clearSession,
  }
}

// Re-export types from store for backward compatibility
export type { UIMessage, ToolCallStatus } from '@/stores/chatStore'
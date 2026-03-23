import { useCallback } from 'react'
import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChatPage() {
  const { messages, isStreaming, error, sendMessage, stopGeneration, clearSession } = useChat()

  // TODO: Implement todo update handler to refresh todo list after AI modifications
  const handleTodoUpdate = useCallback(() => {
    // Placeholder - will be connected to todo state management
  }, [])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSession}
            className="text-gray-500 hover:text-gray-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </header>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Message List - scrollable middle area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isStreaming={isStreaming} onTodoUpdate={handleTodoUpdate} />
      </div>

      {/* Chat Input - fixed at bottom */}
      <div className="border-t border-gray-200">
        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}

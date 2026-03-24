import { useCallback } from 'react'
import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoffeeIcon } from '@/components/icons'

export function ChatPage() {
  const { messages, isStreaming, error, sendMessage, stopGeneration, clearSession } = useChat()

  // TODO: Implement todo update handler to refresh todo list after AI modifications
  const handleTodoUpdate = useCallback(() => {
    // Placeholder - will be connected to todo state management
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-600/10">
            <CoffeeIcon className="h-[18px] w-[18px]" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSession}
            className="text-gray-500 hover:text-gray-900 hover:bg-gray-100"
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
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <MessageList messages={messages} isStreaming={isStreaming} onTodoUpdate={handleTodoUpdate} />
      </div>

      {/* Chat Input - fixed at bottom */}
      <div className="border-t border-gray-200 bg-white shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.05)]">
        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}

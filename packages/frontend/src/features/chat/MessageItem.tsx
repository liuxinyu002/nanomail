import { useMemo } from 'react'
import type { UIMessage, ToolCallStatus } from '@/hooks/useChat'
import { TodoSchema, type Todo } from '@nanomail/shared'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'
import { CoffeeIcon } from '@/components/icons'
import { MarkdownRenderer } from './MarkdownRenderer'
import { TodoCardWidget } from './TodoCardWidget'
import { ToolCallAccordion } from './ToolCallAccordion'
import { LoadingIndicator } from './LoadingIndicator'

interface MessageItemProps {
  message: UIMessage
  isStreaming?: boolean
  onTodoUpdate?: () => void
}

export function MessageItem({ message, isStreaming, onTodoUpdate }: MessageItemProps) {
  const isUser = message.role === 'user'

  // Extract todos from tool calls for TodoCardWidget
  const todosFromToolCalls = useMemo(
    () => extractTodosFromToolCalls(message.toolCalls),
    [message.toolCalls]
  )
  const hasStructuredTodoWidget = todosFromToolCalls.length > 0

  // Create Set of todo IDs for MarkdownRenderer deduplication
  const todoIds = useMemo(
    () => new Set(todosFromToolCalls.map(t => String(t.id))),
    [todosFromToolCalls]
  )

  return (
    <div className="py-4 animate-in fade-in duration-150 ease-out">
      {/* Message Header: Avatar + Label */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
          isUser
            ? "bg-blue-600"
            : "bg-blue-50 border border-blue-600/10"
        )}>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : (
            <CoffeeIcon className="h-4 w-4 text-blue-600" />
          )}
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {isUser ? 'You' : 'AI Assistant'}
        </span>
        {isStreaming && !message.content && (
          <LoadingIndicator />
        )}
      </div>

      {/* Message Content: Full width, no bubble */}
      <div className="ml-9">
        {isUser ? (
          <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer
              content={message.content}
              onTodoToggle={onTodoUpdate}
              todoIds={todoIds}
            />
            {/* Structured todo widget - rendered when tool returns todo data */}
            {hasStructuredTodoWidget && (
              <TodoCardWidget
                todos={todosFromToolCalls}
                onUpdate={onTodoUpdate}
              />
            )}
            {/* Tool calls accordion */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCallAccordion toolCalls={message.toolCalls} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Helper to extract todos from tool call output.
 * Uses flatMap to aggregate todos from ALL tool calls, not just the first one.
 *
 * CRITICAL: Previously this used a for-loop that returned on first match,
 * missing todos from subsequent tool calls in the same message.
 *
 * Validates each todo using TodoSchema.safeParse() to ensure runtime safety.
 * Invalid items are skipped with a warning logged to the console.
 */
function extractTodosFromToolCalls(toolCalls?: ToolCallStatus[]): Todo[] {
  if (!toolCalls) return []

  const todos: Todo[] = []

  for (const tc of toolCalls) {
    // Handle { todos: [...] } output
    if (tc.output?.todos && Array.isArray(tc.output.todos)) {
      for (const item of tc.output.todos) {
        const result = TodoSchema.safeParse(item)
        if (result.success) {
          todos.push(result.data)
        } else {
          console.warn('Invalid todo item in tool call output:', result.error.errors)
        }
      }
    }
    // Handle single todo output
    if (tc.output?.todo && !Array.isArray(tc.output.todo)) {
      const result = TodoSchema.safeParse(tc.output.todo)
      if (result.success) {
        todos.push(result.data)
      } else {
        console.warn('Invalid todo item in tool call output:', result.error.errors)
      }
    }
  }

  return todos
}

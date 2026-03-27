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
  isCompact?: boolean
}

export function MessageItem({ message, isStreaming, isCompact }: MessageItemProps) {
  const isUser = message.role === 'user'

  const todosFromToolCalls = useMemo(
    () => extractTodosFromToolCalls(message.toolCalls),
    [message.toolCalls]
  )
  const hasStructuredTodoWidget = todosFromToolCalls.length > 0

  const todoIds = useMemo(
    () => new Set(todosFromToolCalls.map(t => String(t.id))),
    [todosFromToolCalls]
  )

  return (
    <div className={cn(
      "animate-in fade-in duration-150 ease-out",
      isCompact ? "py-2" : "py-4"
    )}>
      <div className={cn("flex items-center gap-2", isCompact ? "mb-1" : "mb-2")}>
        <div className={cn(
          'rounded-full flex items-center justify-center shrink-0',
          isCompact ? 'w-5 h-5' : 'w-7 h-7',
          isUser
            ? 'bg-blue-600'
            : 'bg-blue-50 border border-blue-600/10'
        )}>
          {isUser ? (
            <User className={isCompact ? "h-3 w-3 text-white" : "h-4 w-4 text-white"} />
          ) : (
            <CoffeeIcon className={isCompact ? "h-3 w-3 text-blue-600" : "h-4 w-4 text-blue-600"} />
          )}
        </div>
        <span className={cn(
          "font-semibold text-gray-900",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {isUser ? 'You' : 'AI'}
        </span>
        {isStreaming && !message.content && (
          <LoadingIndicator size={isCompact ? 'sm' : 'md'} />
        )}
      </div>

      <div className={isCompact ? 'ml-6' : 'ml-9'}>
        {isUser ? (
          <p className={cn(
            "whitespace-pre-wrap text-gray-800",
            isCompact ? "text-sm" : "text-base"
          )}>{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer
              content={message.content}
              todoIds={todoIds}
              isCompact={isCompact}
            />
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCallAccordion toolCalls={message.toolCalls} />
            )}
            {hasStructuredTodoWidget && (
              <TodoCardWidget
                todos={todosFromToolCalls}
                readonly
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Check if tool name is a create or update todo operation
function isCreateOrUpdateTodoTool(toolName: string): boolean {
  return toolName === 'createTodo' || toolName === 'updateTodo'
}

function extractTodosFromToolCalls(toolCalls?: ToolCallStatus[]): Todo[] {
  if (!toolCalls) return []

  const todosById = new Map<string, Todo>()

  for (const toolCall of toolCalls) {
    if (toolCall.status !== 'success') continue
    if (!isCreateOrUpdateTodoTool(toolCall.toolName)) continue
    if (!toolCall.output) continue

    const candidates: unknown[] = []

    if (Array.isArray(toolCall.output.todos)) {
      candidates.push(...toolCall.output.todos)
    }

    if (toolCall.output.todo && !Array.isArray(toolCall.output.todo)) {
      candidates.push(toolCall.output.todo)
    }

    for (const candidate of candidates) {
      const result = TodoSchema.safeParse(candidate)
      if (!result.success) continue
      todosById.set(String(result.data.id), result.data)
    }
  }

  return Array.from(todosById.values())
}

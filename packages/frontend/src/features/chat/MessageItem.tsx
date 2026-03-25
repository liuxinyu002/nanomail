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
    <div className="py-4 animate-in fade-in duration-150 ease-out">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
          isUser
            ? 'bg-blue-600'
            : 'bg-blue-50 border border-blue-600/10'
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

      <div className="ml-9">
        {isUser ? (
          <p className="whitespace-pre-wrap text-gray-800">{message.content}</p>
        ) : (
          <>
            <MarkdownRenderer
              content={message.content}
              onTodoToggle={onTodoUpdate}
              todoIds={todoIds}
            />
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCallAccordion toolCalls={message.toolCalls} />
            )}
            {hasStructuredTodoWidget && (
              <TodoCardWidget
                todos={todosFromToolCalls}
                onUpdate={onTodoUpdate}
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

import { useMemo, useState } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import type { ToolCallStatus } from '@/hooks/useChat'
import { cn } from '@/lib/utils'

// Tool name labels matching backend naming convention (camelCase)
const TODO_TOOL_LABELS: Record<string, string> = {
  createTodo: '创建待办',
  updateTodo: '修改待办',
  deleteTodo: '删除待办',
}

const TODO_TOOL_CHIP_COLORS: Record<string, string> = {
  createTodo: '#B8E6C1',
  updateTodo: '#FFD8A8',
  deleteTodo: '#FFB5BA',
}

// Check if tool name is a delete todo operation
function isDeleteTodoTool(toolName: string): boolean {
  return toolName === 'deleteTodo'
}

// Check if tool name is a create or update todo operation
function isCreateOrUpdateTodoTool(toolName: string): boolean {
  return toolName === 'createTodo' || toolName === 'updateTodo'
}

function hasStructuredTodoPayload(toolCall: ToolCallStatus): boolean {
  if (isDeleteTodoTool(toolCall.toolName)) return false
  if (!isCreateOrUpdateTodoTool(toolCall.toolName)) return false
  if (!toolCall.output || typeof toolCall.output !== 'object') return false

  const output = toolCall.output
  return Boolean(output.todo) || (Array.isArray(output.todos) && output.todos.length > 0)
}

function getTodoToolLabel(toolName: string): string {
  return TODO_TOOL_LABELS[toolName] ?? toolName
}

function getDisplayMessage(toolCall: ToolCallStatus): string {
  const label = getTodoToolLabel(toolCall.toolName)

  if (toolCall.toolName in TODO_TOOL_LABELS) {
    if (toolCall.status === 'pending') {
      return `${label}中...`
    }

    return label
  }

  if (toolCall.status === 'pending') {
    return `${toolCall.toolName}...`
  }

  if (toolCall.status === 'error') {
    return toolCall.toolName
  }

  return toolCall.message || toolCall.toolName
}

function getFallbackText(toolCall: ToolCallStatus): string | undefined {
  if (toolCall.status === 'error' || toolCall.status === 'pending') return undefined
  if (hasStructuredTodoPayload(toolCall)) return undefined
  if (!toolCall.output) return undefined

  if (typeof toolCall.output.message === 'string' && toolCall.output.message.trim().length > 0) {
    return toolCall.output.message
  }

  if (typeof toolCall.output.result === 'string' && toolCall.output.result.trim().length > 0) {
    return toolCall.output.result
  }

  return undefined
}

export function ToolStatusBadge(toolCall: ToolCallStatus) {
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const isTodoTool = toolCall.toolName in TODO_TOOL_LABELS
  const displayMessage = useMemo(() => getDisplayMessage(toolCall), [toolCall])
  const fallbackText = useMemo(() => getFallbackText(toolCall), [toolCall])

  const icons = {
    pending: <Loader2 className="h-3 w-3 animate-spin text-gray-500" />,
    success: <Check className="h-3 w-3 text-green-600" />,
    error: <X className="h-3 w-3 text-red-600" />,
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs',
          isTodoTool ? 'text-gray-700' : 'bg-gray-50 text-gray-600'
        )}
        style={isTodoTool ? { backgroundColor: TODO_TOOL_CHIP_COLORS[toolCall.toolName] } : undefined}
      >
        {icons[toolCall.status]}
        <span>{displayMessage}</span>
      </div>

      {fallbackText && (
        <div className="pl-2 text-xs text-gray-500">{fallbackText}</div>
      )}

      {toolCall.status === 'error' && toolCall.message && (
        <div className="pl-2">
          <button
            type="button"
            onClick={() => setShowErrorDetails(prev => !prev)}
            className="text-xs text-red-600 hover:text-red-700"
          >
            {showErrorDetails ? '隐藏错误详情' : '显示错误详情'}
          </button>
          {showErrorDetails && (
            <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded border border-gray-200 bg-white p-2 text-xs text-gray-600">
              {toolCall.message}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

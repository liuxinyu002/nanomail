import { Loader2, Check, X } from 'lucide-react'
import type { ToolCallStatus } from '@/hooks/useChat'

/**
 * ToolStatusBadge - Inline status indicator for tool calls
 *
 * States:
 * - pending: Spinning loader with ellipsis
 * - success: Green checkmark
 * - error: Red X icon
 */
export function ToolStatusBadge({ toolName, status, message }: ToolCallStatus) {
  const icons = {
    pending: <Loader2 className="h-3 w-3 animate-spin text-gray-500" />,
    success: <Check className="h-3 w-3 text-green-600" />,
    error: <X className="h-3 w-3 text-red-600" />,
  }

  const displayMessage = status === 'pending'
    ? `${toolName}...`
    : message || toolName

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
      {icons[status]}
      <span>{displayMessage}</span>
    </div>
  )
}

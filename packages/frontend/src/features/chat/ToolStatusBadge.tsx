import { useState } from 'react'
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
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  const icons = {
    pending: <Loader2 className="h-3 w-3 animate-spin text-gray-500" />,
    success: <Check className="h-3 w-3 text-green-600" />,
    error: <X className="h-3 w-3 text-red-600" />,
  }

  const displayMessage = status === 'pending'
    ? `${toolName}...`
    : status === 'error'
      ? toolName
      : message || toolName

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600">
        {icons[status]}
        <span>{displayMessage}</span>
      </div>

      {status === 'error' && message && (
        <div className="pl-2">
          <button
            type="button"
            onClick={() => setShowErrorDetails(prev => !prev)}
            className="text-xs text-red-600 hover:text-red-700"
          >
            {showErrorDetails ? 'Hide error details' : 'Show error details'}
          </button>
          {showErrorDetails && (
            <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded border border-gray-200 bg-white p-2 text-xs text-gray-600">
              {message}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

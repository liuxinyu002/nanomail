import { useState, useEffect } from 'react'
import { Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolStatusBadge } from './ToolStatusBadge'
import type { ToolCallStatus } from '@/hooks/useChat'

interface ToolCallAccordionProps {
  toolCalls: ToolCallStatus[]
}

/**
 * ToolCallAccordion - Collapsible container for multiple tool calls
 *
 * Features:
 * - Collapsed: Show summary (e.g., "Performed 3 actions")
 * - Expanded: Show individual ToolStatusBadge components
 * - Auto-expand while any tool is pending
 * - Auto-collapse when all tools complete (800ms delay)
 */
export function ToolCallAccordion({ toolCalls }: ToolCallAccordionProps) {
  const hasPending = toolCalls?.some(tc => tc.status === 'pending') ?? false
  const [expanded, setExpanded] = useState(hasPending)

  // Auto-expand when pending, auto-collapse when all complete
  useEffect(() => {
    if (hasPending) {
      setExpanded(true)
    } else if (expanded && !hasPending) {
      // Small delay before collapsing to let user see completion
      const timer = setTimeout(() => setExpanded(false), 800)
      return () => clearTimeout(timer)
    }
  }, [hasPending, expanded])

  // Handle empty/undefined
  if (!toolCalls || toolCalls.length === 0) return null

  // Single tool call: show inline without accordion
  if (toolCalls.length === 1) {
    return <ToolStatusBadge {...toolCalls[0]} />
  }

  // Multiple tool calls: collapsible accordion
  const successCount = toolCalls.filter(tc => tc.status === 'success').length
  const pendingCount = toolCalls.filter(tc => tc.status === 'pending').length
  const errorCount = toolCalls.filter(tc => tc.status === 'error').length

  const summary = pendingCount > 0
    ? `Processing ${pendingCount} action${pendingCount > 1 ? 's' : ''}...`
    : errorCount > 0
      ? `Completed with ${errorCount} error${errorCount > 1 ? 's' : ''}`
      : `Performed ${successCount} action${successCount > 1 ? 's' : ''}`

  return (
    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          {summary}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          expanded && "rotate-180"
        )} />
      </button>
      {expanded && (
        <div className="p-2 space-y-1 bg-white">
          {toolCalls.map(tc => (
            <ToolStatusBadge key={tc.id} {...tc} />
          ))}
        </div>
      )}
    </div>
  )
}

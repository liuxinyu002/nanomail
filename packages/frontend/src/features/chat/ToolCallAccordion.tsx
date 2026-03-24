import { useState, useEffect } from 'react'
import { Settings, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolStatusBadge } from './ToolStatusBadge'
import type { ToolCallStatus } from '@/hooks/useChat'

interface ToolCallAccordionProps {
  toolCalls: ToolCallStatus[]
}

function buildSummary(toolCalls: ToolCallStatus[]): string {
  const counts = toolCalls.reduce(
    (acc, toolCall) => {
      switch (toolCall.toolName) {
        case 'create_todo':
          acc.create += 1
          break
        case 'update_todo':
          acc.update += 1
          break
        case 'delete_todo':
          acc.delete += 1
          break
        default:
          acc.other += 1
          break
      }
      return acc
    },
    { create: 0, update: 0, delete: 0, other: 0 }
  )

  const segments = [
    counts.create > 0 ? `创建 ${counts.create} 项` : null,
    counts.update > 0 ? `修改 ${counts.update} 项` : null,
    counts.delete > 0 ? `删除 ${counts.delete} 项` : null,
    counts.other > 0 ? `其他 ${counts.other} 项` : null,
  ].filter(Boolean)

  return segments.join(' · ') || `其他 ${toolCalls.length} 项`
}

export function ToolCallAccordion({ toolCalls }: ToolCallAccordionProps) {
  const hasPending = toolCalls?.some(tc => tc.status === 'pending') ?? false
  const [expanded, setExpanded] = useState(hasPending)

  useEffect(() => {
    if (hasPending) {
      setExpanded(true)
    } else if (expanded && !hasPending) {
      const timer = setTimeout(() => setExpanded(false), 800)
      return () => clearTimeout(timer)
    }
  }, [hasPending, expanded])

  if (!toolCalls || toolCalls.length === 0) return null

  if (toolCalls.length === 1) {
    return <ToolStatusBadge {...toolCalls[0]} />
  }

  const summary = buildSummary(toolCalls)

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          {summary}
        </span>
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform',
          expanded && 'rotate-180'
        )} />
      </button>
      {expanded && (
        <div className="bg-white p-2 space-y-1">
          {toolCalls.map(tc => (
            <ToolStatusBadge key={tc.id} {...tc} />
          ))}
        </div>
      )}
    </div>
  )
}

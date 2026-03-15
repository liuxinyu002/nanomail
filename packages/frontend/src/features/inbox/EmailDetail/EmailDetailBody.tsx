/**
 * EmailDetailBody - Body content component for email detail view
 *
 * Features:
 * - Pure text rendering (no HTML parsing)
 * - CSS white-space: pre-wrap preserves line breaks
 * - Scrollable container for long content
 * - Accessible region for screen readers
 */

interface EmailDetailBodyProps {
  bodyText: string | null
}

export function EmailDetailBody({ bodyText }: EmailDetailBodyProps) {
  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      role="region"
      aria-label="Email content"
    >
      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
        {bodyText || '(No content)'}
      </div>
    </div>
  )
}
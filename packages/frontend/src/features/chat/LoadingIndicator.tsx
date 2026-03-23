import { Sparkles } from 'lucide-react'

/**
 * LoadingIndicator - Blinking cursor for AI text generation
 *
 * Design Decision: Use blinking cursor instead of bouncing dots
 * to match the AI text generation feel.
 *
 * Per docs/SPEC/design-system.md: Uses 150ms ease-out fade-in animation
 */
export function LoadingIndicator() {
  return (
    <span
      className="inline-block w-2 h-5 bg-gray-800 animate-pulse"
      aria-label="AI is thinking"
    />
  )
}

/**
 * Alternative: Pulsing AI icon with text
 * Use this for a more explicit loading state
 */
export function LoadingIndicatorIcon() {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <Sparkles className="h-4 w-4 animate-pulse" />
      <span className="text-sm">Thinking...</span>
    </div>
  )
}

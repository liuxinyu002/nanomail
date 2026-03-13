/**
 * Agent Logger Utilities
 *
 * Provides formatting and truncation utilities for consistent agent debug logging.
 * Focuses on "Decision" and "Boundary" logging, not verbose data dumps.
 */

/**
 * Truncation mode
 * - BOTH: Keep head and tail
 * - HEAD: Keep only head
 */
export type TruncateMode = 'BOTH' | 'HEAD'

/**
 * Truncation options
 */
export interface TruncateOptions {
  maxLength: number     // Maximum length before truncation
  headLength: number    // Characters to keep at the start
  tailLength: number    // Characters to keep at the end (for BOTH mode)
  marker?: string       // Omission marker (default: '...')
}

/**
 * Default truncation presets for different content types
 */
export const TRUNCATE_PRESETS = {
  THOUGHT: { maxLength: 200, headLength: 50, tailLength: 50, marker: '...[truncated]...' },
  TOOL_ARGS: { maxLength: 100, headLength: 30, tailLength: 30, marker: '...' },
  TOOL_RESULT: { maxLength: 200, headLength: 50, tailLength: 50, marker: '...' },
  LLM_RESPONSE: { maxLength: 200, headLength: 50, tailLength: 50, marker: '...[truncated]...' }
} as const satisfies Record<string, TruncateOptions>

/**
 * Truncate a string with configurable options
 *
 * @param content - String to truncate
 * @param options - Truncation options
 * @param mode - Truncation mode: 'BOTH' (head+tail) or 'HEAD' (head only)
 * @returns Truncated string with marker
 */
export function truncate(
  content: string,
  options: TruncateOptions,
  mode: TruncateMode = 'BOTH'
): string {
  if (!content) return '(empty)'

  const { maxLength, headLength, tailLength, marker = '...' } = options

  // Return as-is if under max length
  if (content.length <= maxLength) return content

  switch (mode) {
    case 'HEAD':
      return content.slice(0, headLength) + marker

    case 'BOTH':
    default:
      return content.slice(0, headLength) + marker + content.slice(-tailLength)
  }
}

/**
 * Format tool arguments for logging
 * Shows tool name and argument keys (not values for privacy)
 *
 * @param toolName - Name of the tool
 * @param args - Tool arguments
 * @returns Formatted string like "Call search-emails with keys: [query, limit]"
 */
export function formatToolArgs(
  toolName: string,
  args: Record<string, unknown>
): string {
  const keys = Object.keys(args)
  if (keys.length === 0) {
    return `Call ${toolName} (no args)`
  }
  return `Call ${toolName} with keys: [${keys.join(', ')}]`
}

/**
 * Format tool result for logging
 * Uses HEAD mode truncation with byte size annotation
 *
 * @param result - Tool execution result
 * @returns Formatted string with truncation and size annotation
 */
export function formatToolResult(result: unknown): string {
  if (result === null || result === undefined) return '(empty)'
  if (result instanceof Error) return `Error: ${result.message}`

  const str = typeof result === 'string' ? result : JSON.stringify(result)

  // Calculate original byte size
  const size = new TextEncoder().encode(str).length

  // Return as-is if under max length
  if (str.length <= TRUNCATE_PRESETS.TOOL_RESULT.maxLength) {
    return str
  }

  // Truncate with HEAD mode and add byte annotation
  const truncated = truncate(str, TRUNCATE_PRESETS.TOOL_RESULT, 'HEAD')
  return `${truncated} (Total: ${size} bytes)`
}

/**
 * Create step prefix for iteration tracking
 *
 * @param step - Step/iteration number
 * @returns Formatted step prefix like "[Step 1]"
 */
export function withStep(step: number): string {
  return `[Step ${step}]`
}

/**
 * Create agent log prefix with module and optional step
 *
 * @param module - Module name (Loop, Tool, Context)
 * @param step - Optional step number
 * @returns Formatted prefix like "[Agent] [Loop] [Step 1]"
 */
export function agentPrefix(module: string, step?: number): string {
  const stepPart = step !== undefined ? ` [Step ${step}]` : ''
  return `[Agent] [${module}]${stepPart}`
}
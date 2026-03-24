/**
 * ReAct Agent Loop Types
 * Reference: nanobot/agent/loop.py
 */

import type { ContextMessage, AgentRole } from '../context/types'

// Re-export ContextMessage as AgentMessage for backward compatibility
export type AgentMessage = ContextMessage

/**
 * Conversation event types for SSE streaming
 *
 * NOTE: Business-specific events (todos_created, todos_updated, etc.) are intentionally
 * omitted to keep AgentLoop generic. Frontend should listen to `tool_call_end` and
 * parse toolOutput to update local state based on toolName.
 */
export type ConversationEventType =
  | 'session_start'      // Session initialized
  | 'thinking'           // AI reasoning (collapsible in UI)
  | 'tool_call_start'    // Tool invocation started
  | 'tool_call_end'      // Tool invocation completed (frontend uses this to update UI)
  | 'result_chunk'       // Final response chunk (typewriter effect)
  | 'session_end'        // Session completed
  | 'error'              // Error occurred

/**
 * Base event structure for SSE streaming
 */
export interface ConversationEvent {
  type: ConversationEventType
  sessionId: string      // Unique session identifier
  messageId: string      // Maps to frontend message bubble
  timestamp: string      // ISO datetime
  data: ThinkingData | ToolCallData | ResultChunkData | ErrorData | null
}

/**
 * AI thinking/reasoning content
 */
export interface ThinkingData {
  content: string        // Chain-of-thought content
}

/**
 * Final response content for user
 */
export interface ResultChunkData {
  content: string        // User-facing message chunk
}

/**
 * Tool call data
 */
export interface ToolCallData {
  toolCallId: string        // Unique ID to link start/end events and tool results
  toolName: string
  toolInput: Record<string, unknown>
  toolOutput?: Record<string, unknown>  // Only in tool_call_end
  truncated?: boolean     // If output was truncated for SSE
}

/**
 * Error data
 */
export interface ErrorData {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * Agent context passed to AgentLoop.run()
 */
export interface AgentContext {
  role: AgentRole           // 'todo-agent' | 'email-analyzer' | future roles
  sessionId: string         // Generated UUID
  messageId: string         // For SSE event mapping
  currentTime: string       // ISO datetime from request
  timeZone: string          // User timezone
  sourcePage?: string       // Optional page context
}

/**
 * Agent configuration
 * Reference: nanobot/agent/loop.py - AgentLoop.__init__()
 */
export interface AgentConfig {
  model?: string // Optional: if not provided, provider uses dynamic config from database
  temperature: number
  maxTokens: number
  maxIterations: number // Default: 5 for email drafts
  memoryWindow: number // Default: 100
  reasoningEffort?: 'low' | 'medium' | 'high'
}

/**
 * Agent Loop Constants
 * All iteration limits defined in one place for clarity
 */

/** Default iterations for simple tasks (todo management) */
export const DEFAULT_MAX_ITERATIONS = 5

/** Iterations for complex multi-step tasks */
export const COMPLEX_MAX_ITERATIONS = 10

/** Iterations for research/exploration tasks (highest allowed) */
export const RESEARCH_MAX_ITERATIONS = 20

/** Hard limit to prevent infinite loops - no config can exceed this */
export const MAX_STEPS = 20

/** Default temperature for deterministic outputs */
export const DEFAULT_TEMPERATURE = 0.7

/** Higher temperature for creative tasks */
export const CREATIVE_TEMPERATURE = 0.9

/** Lower temperature for precise/factual tasks */
export const PRECISE_TEMPERATURE = 0.5

/** Default max tokens per response */
export const DEFAULT_MAX_TOKENS = 8192

/** Default memory window (messages to keep) */
export const DEFAULT_MEMORY_WINDOW = 100

/**
 * Preset configurations for different use cases
 * Values derived from constants above for single source of truth
 */
export const AGENT_PRESETS = {
  // For todo management tasks - simple, fast
  todo: {
    maxIterations: DEFAULT_MAX_ITERATIONS,
    temperature: DEFAULT_TEMPERATURE
  },
  // For complex multi-step tasks
  complex: {
    maxIterations: COMPLEX_MAX_ITERATIONS,
    temperature: DEFAULT_TEMPERATURE
  },
  // For research/exploration tasks (uses MAX_STEPS)
  research: {
    maxIterations: RESEARCH_MAX_ITERATIONS,
    temperature: PRECISE_TEMPERATURE
  }
} as const

export type AgentPreset = keyof typeof AGENT_PRESETS

/**
 * Default agent configuration
 * Note: model is intentionally not set here - provider will use dynamic config from database
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  temperature: DEFAULT_TEMPERATURE,
  maxTokens: DEFAULT_MAX_TOKENS,
  maxIterations: DEFAULT_MAX_ITERATIONS,
  memoryWindow: DEFAULT_MEMORY_WINDOW
}

/**
 * Tool dependencies passed to AgentLoop.run()
 * Provides context needed for tool execution
 */
export interface ToolDeps {
  dataSource: unknown // TypeORM DataSource
  defaultColumnId?: number // Default column for new todos (default: 1)
}

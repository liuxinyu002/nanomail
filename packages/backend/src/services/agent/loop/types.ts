/**
 * ReAct Agent Loop Types
 * Reference: nanobot/agent/loop.py
 */

import type { ContextMessage } from '../context/types'

// Re-export ContextMessage as AgentMessage for backward compatibility
export type AgentMessage = ContextMessage

/**
 * Progress event for streaming
 * Reference: nanobot/agent/loop.py - on_progress callback
 */
export interface ProgressEvent {
  type: 'thought' | 'action' | 'observation' | 'chunk' | 'done' | 'error'
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
  iteration?: number
}

/**
 * Agent state during ReAct loop
 */
export interface AgentState {
  iteration: number
  messages: ContextMessage[]
  finalContent: string | null
  toolsUsed: string[]
  finishReason: 'completed' | 'max_iterations' | 'error'
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
 * Preset configurations for different use cases
 */
export const AGENT_PRESETS = {
  // For email draft generation, simple tool calls
  draft: {
    maxIterations: 5,
    temperature: 0.7
  },
  // For more complex multi-step tasks
  complex: {
    maxIterations: 10,
    temperature: 0.7
  },
  // For research/exploration tasks
  research: {
    maxIterations: 20,
    temperature: 0.5
  }
} as const

export type AgentPreset = keyof typeof AGENT_PRESETS

/**
 * Default agent configuration
 * Note: model is intentionally not set here - provider will use dynamic config from database
 */
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  // model: undefined by default, let provider decide from database settings
  temperature: 0.7,
  maxTokens: 8192,
  maxIterations: 5,
  memoryWindow: 100
}

/**
 * Interface for email data passed to agent
 */
export interface AgentEmail {
  id: number
  sender: string | null
  subject: string | null
  bodyText: string | null
  date: Date
}
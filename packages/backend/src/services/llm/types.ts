/**
 * LLM Types and Interfaces
 * Reference: nanobot/providers/base.py
 */

/**
 * Tool call request from LLM response
 * Maps to nanobot's ToolCallRequest dataclass
 */
export interface ToolCallRequest {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/**
 * Thinking block for extended reasoning (Anthropic)
 */
export interface ThinkingBlock {
  type: string
  thinking: string
}

/**
 * Token usage information
 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Normalized LLM response
 * Maps to nanobot's LLMResponse dataclass
 */
export interface LLMResponse {
  content: string | null
  toolCalls: ToolCallRequest[]
  finishReason: 'stop' | 'tool_calls' | 'error' | 'length'
  usage: TokenUsage
  // Extended reasoning for DeepSeek-R1, Kimi, etc.
  reasoningContent?: string
  thinkingBlocks?: ThinkingBlock[]
}

/**
 * Provider specification for registry
 * Maps to nanobot's ProviderSpec frozen dataclass
 */
export interface ProviderSpec {
  readonly name: string
  readonly keywords: readonly string[]
  readonly envKey: string
  readonly displayName: string
  readonly litellmPrefix: string
  readonly defaultApiBase: string
  readonly isGateway: boolean // Routes any model (e.g., OpenRouter)
  readonly isLocal: boolean // Local deployment (Ollama, vLLM)
  readonly supportsPromptCaching: boolean
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  toolCalls?: ToolCallRequest[]
  toolCallId?: string
}

/**
 * Parameters for chat completion
 */
export interface ChatParams {
  messages: ChatMessage[]
  tools?: Array<Record<string, unknown>>
  model?: string
  maxTokens?: number
  temperature?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}

/**
 * Dynamic configuration for LLM Provider
 */
export interface LLMConfig {
  apiKey: string | null
  apiBase: string | null
  model: string | null
}

/**
 * Function to dynamically fetch LLM configuration
 * Allows decoupling provider from settings service
 */
export type GetConfigFn = () => Promise<LLMConfig>

/**
 * Configuration for LLM Provider
 */
export interface LLMProviderConfig {
  apiKey?: string
  apiBase?: string
  defaultModel?: string
  /** Dynamic config getter - takes precedence over static config */
  getConfig?: GetConfigFn
}
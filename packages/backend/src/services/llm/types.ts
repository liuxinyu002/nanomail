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
 * Streaming chunk from LLM
 * Yielded incrementally as the LLM generates content
 */
export interface LLMStreamChunk {
  /** Text content delta (null for final chunk or tool-only chunks) */
  content: string | null
  /** Accumulated tool calls (populated in final chunk) */
  toolCalls: ToolCallRequest[]
  /** Whether this is the final chunk */
  isDone: boolean
  /** Reason for completion (only in final chunk) */
  finishReason?: 'stop' | 'tool_calls' | 'error' | 'length'
}

/**
 * Async generator type for streaming responses
 */
export type LLMStreamResponse = AsyncGenerator<LLMStreamChunk, void, unknown>

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
  readonly defaultContextWindow?: number // Fallback context window for unknown models
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
 * Parameters for streaming chat completion
 * Extends ChatParams with cancellation support
 */
export interface ChatStreamParams extends ChatParams {
  /** AbortSignal for cancellation */
  signal?: AbortSignal
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

/**
 * Model specification with context window information
 * Used for token-based truncation decisions
 */
export interface ModelSpec {
  readonly id: string
  readonly contextWindow: number
  readonly maxOutputTokens?: number
  readonly provider: string
}

/**
 * Truncation configuration for message history management
 */
export interface TruncationConfig {
  /** Safety threshold (0.8 = 80% of context window) */
  readonly safeThreshold: number
  /** Maximum characters for tool output (~750 tokens at 4 chars/token) */
  readonly maxToolOutputChars: number
  /** Number of recent conversation turns to protect from truncation */
  readonly protectedRecentTurns: number
  /** Hard limit on total messages */
  readonly maxMessagesLimit: number
  /** Character to token estimation ratio */
  readonly charsPerTokenEstimate: number
}
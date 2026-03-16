/**
 * LiteLLM Provider - Multi-provider support via OpenAI-compatible API
 * Reference: nanobot/providers/litellm_provider.py
 */

import OpenAI from 'openai'
import { LLMProvider } from './base-provider'
import { ProviderRegistry } from './provider-registry'
import type { LLMResponse, ChatParams, ChatStreamParams, LLMStreamResponse, ChatMessage, ProviderSpec, LLMProviderConfig, LLMConfig, GetConfigFn, ToolCallRequest } from './types'
import { createLogger } from '../../config/logger.js'

const log = createLogger('LiteLLMProvider')

// Standard chat-completion message keys
const ALLOWED_MSG_KEYS = new Set([
  'role',
  'content',
  'toolCalls',
  'toolCallId',
  'name'
])

/**
 * Generate a 9-char alphanumeric ID compatible with all providers
 */
function shortToolId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Normalize tool call ID to 9-char alphanumeric
 */
function normalizeToolCallId(id: string): string {
  if (id.length === 9 && /^[a-zA-Z0-9]+$/.test(id)) {
    return id
  }
  // Simple hash to 9 chars
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  // Convert to alphanumeric
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const absHash = Math.abs(hash)
  for (let i = 0; i < 9; i++) {
    result += chars.charAt((absHash + i * 7) % chars.length)
  }
  return result
}

/**
 * Type for accumulated tool call delta during streaming
 */
interface ToolCallDelta {
  id: string
  name: string
  arguments: string
}

/**
 * LiteLLM Provider using OpenAI SDK
 * Supports multiple providers through a unified interface
 */
export class LiteLLMProvider extends LLMProvider {
  private client: OpenAI | null = null
  private defaultModel: string
  private providerRegistry: ProviderRegistry
  private readonly getConfig: GetConfigFn | null
  // Cached static config (fallback when no dynamic getter)
  private readonly staticApiKey: string
  private readonly staticApiBase: string | undefined

  constructor(config: LLMProviderConfig = {}) {
    super(config)

    this.providerRegistry = new ProviderRegistry()
    this.defaultModel = config.defaultModel ?? 'gpt-4o-mini'
    this.getConfig = config.getConfig ?? null
    this.staticApiKey = config.apiKey ?? 'ollama'
    this.staticApiBase = config.apiBase

    // Initialize OpenAI client with static config (for backward compatibility)
    if (!this.getConfig) {
      this.client = new OpenAI({
        apiKey: this.staticApiKey,
        baseURL: this.staticApiBase
      })
    }
  }

  /**
   * Get OpenAI client, refreshing with dynamic config if available
   */
  private async getClient(): Promise<OpenAI> {
    if (this.getConfig) {
      const dynamicConfig = await this.getConfig()
      return new OpenAI({
        apiKey: dynamicConfig.apiKey ?? this.staticApiKey,
        baseURL: dynamicConfig.apiBase ?? this.staticApiBase
      })
    }
    return this.client!
  }

  /**
   * Get the model to use, preferring dynamic config
   */
  private async getModel(requestedModel?: string): Promise<string> {
    if (requestedModel) {
      return requestedModel
    }
    if (this.getConfig) {
      const dynamicConfig = await this.getConfig()
      if (dynamicConfig.model) {
        return dynamicConfig.model
      }
    }
    return this.defaultModel
  }

  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return this.defaultModel
  }

  /**
   * Detect provider from model name
   */
  detectProvider(model: string): ProviderSpec | null {
    return this.providerRegistry.detectByModel(model) ?? null
  }

  /**
   * No-op: return model name unchanged
   * Zero Magic strategy - user has full control over model name
   * - Direct API: model = "deepseek-chat"
   * - LiteLLM proxy: model = "deepseek/deepseek-chat"
   */
  applyModelPrefix(model: string): string {
    return model
  }

  /**
   * Sanitize messages for API call
   */
  private sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
    // First, sanitize empty content
    let sanitized = LLMProvider.sanitizeEmptyContent(messages)

    // Then, keep only allowed keys
    sanitized = LLMProvider.sanitizeRequestMessages(sanitized, ALLOWED_MSG_KEYS)

    // Normalize tool call IDs
    const idMap = new Map<string, string>()

    for (const msg of sanitized) {
      if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
        for (const tc of msg.toolCalls) {
          if (tc.id && !idMap.has(tc.id)) {
            idMap.set(tc.id, normalizeToolCallId(tc.id))
          }
        }
      }
    }

    return sanitized.map(msg => {
      if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
        return {
          ...msg,
          toolCalls: msg.toolCalls.map(tc => ({
            ...tc,
            id: tc.id ? idMap.get(tc.id) ?? tc.id : tc.id
          }))
        }
      }
      if (msg.toolCallId && idMap.has(msg.toolCallId)) {
        return {
          ...msg,
          toolCallId: idMap.get(msg.toolCallId)
        }
      }
      return msg
    })
  }

  /**
   * Convert messages to OpenAI format
   */
  private toOpenAIMessages(messages: ChatMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      if (msg.role === 'system') {
        return { role: 'system', content: msg.content ?? '' } as OpenAI.Chat.Completions.ChatCompletionSystemMessageParam
      }
      if (msg.role === 'user') {
        return { role: 'user', content: msg.content ?? '' } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam
      }
      if (msg.role === 'assistant') {
        const assistantMsg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: msg.content
        }
        if (msg.toolCalls) {
          assistantMsg.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        }
        return assistantMsg
      }
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: msg.toolCallId ?? '',
          content: msg.content ?? ''
        } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam
      }
      // Fallback
      return { role: 'user', content: msg.content ?? '' } as OpenAI.Chat.Completions.ChatCompletionUserMessageParam
    })
  }

  /**
   * Parse OpenAI response to LLMResponse
   */
  private parseResponse(response: OpenAI.Chat.Completions.ChatCompletion): LLMResponse {
    const choice = response.choices[0]
    if (!choice) {
      return {
        content: null,
        toolCalls: [],
        finishReason: 'error',
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0
        }
      }
    }
    const message = choice.message

    // Parse tool calls
    const toolCalls: ToolCallRequest[] = []
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        // Check if it's a function tool call (not a custom tool call)
        if (tc.type !== 'function') continue
        let args: string | Record<string, unknown> = tc.function.arguments
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args) as Record<string, unknown>
          } catch {
            args = {}
          }
        }

        toolCalls.push({
          id: shortToolId(),
          name: tc.function.name,
          arguments: args as Record<string, unknown>
        })
      }
    }

    // Determine finish reason
    let finishReason: LLMResponse['finishReason'] = 'stop'
    if (choice.finish_reason === 'tool_calls') {
      finishReason = 'tool_calls'
    } else if (choice.finish_reason === 'length') {
      finishReason = 'length'
    } else if (choice.finish_reason === 'content_filter' || !choice.finish_reason) {
      finishReason = 'stop'
    }

    return {
      content: message.content ?? null,
      toolCalls,
      finishReason,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0
      }
    }
  }

  /**
   * Accumulate tool call delta from stream chunk
   */
  private accumulateToolCallDelta(
    accumulated: Map<number, ToolCallDelta>,
    tc: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall
  ): void {
    if (tc.type !== 'function') return

    const index = tc.index
    const existing = accumulated.get(index)

    if (existing) {
      // Append to existing tool call
      if (tc.function?.arguments) {
        existing.arguments += tc.function.arguments
      }
    } else {
      // New tool call
      accumulated.set(index, {
        id: tc.id ?? shortToolId(),
        name: tc.function?.name ?? '',
        arguments: tc.function?.arguments ?? ''
      })
    }
  }

  /**
   * Build final tool calls from accumulated deltas
   */
  private buildFinalToolCalls(accumulated: Map<number, ToolCallDelta>): ToolCallRequest[] {
    const toolCalls: ToolCallRequest[] = []
    for (const tc of accumulated.values()) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.arguments) as Record<string, unknown>
      } catch {
        args = {}
      }
      toolCalls.push({
        id: tc.id,
        name: tc.name,
        arguments: args
      })
    }
    return toolCalls
  }

  /**
   * Send a chat completion request
   * Reference: nanobot/providers/litellm_provider.py - chat()
   */
  async chat(params: ChatParams): Promise<LLMResponse> {
    const model = await this.getModel(params.model)
    const resolvedModel = this.applyModelPrefix(model)

    // Get client with dynamic config
    const client = await this.getClient()

    // Debug: log actual LLM config being used
    const apiKey = client.apiKey
    const baseURL = client.baseURL
    log.debug({
      model: resolvedModel,
      baseURL,
      apiKeyConfigured: !!apiKey
    }, 'LLM request config')

    // Sanitize messages
    const sanitizedMessages = this.sanitizeMessages(params.messages)
    const openaiMessages = this.toOpenAIMessages(sanitizedMessages)

    // Clamp maxTokens to at least 1
    const maxTokens = Math.max(1, params.maxTokens ?? 4096)

    try {
      const response = await client.chat.completions.create({
        model: resolvedModel,
        messages: openaiMessages,
        max_tokens: maxTokens,
        temperature: params.temperature ?? 0.7,
        tools: params.tools as OpenAI.Chat.Completions.ChatCompletionTool[] | undefined,
        tool_choice: params.tools ? 'auto' : undefined
      })

      return this.parseResponse(response)
    } catch (error) {
      // Return error as content for graceful handling
      return {
        content: `Error calling LLM: ${error instanceof Error ? error.message : String(error)}`,
        toolCalls: [],
        finishReason: 'error',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      }
    }
  }

  /**
   * Streaming chat completion with cancellation support
   * Yields chunks as they arrive from the LLM
   */
  async *chatStream(params: ChatStreamParams): LLMStreamResponse {
    const model = await this.getModel(params.model)
    const resolvedModel = this.applyModelPrefix(model)

    // Get client with dynamic config
    const client = await this.getClient()

    // Debug: log actual LLM config being used
    const apiKey = client.apiKey
    const baseURL = client.baseURL
    log.debug({
      model: resolvedModel,
      baseURL,
      apiKeyConfigured: !!apiKey
    }, 'LLM stream request config')

    // Sanitize messages
    const sanitizedMessages = this.sanitizeMessages(params.messages)
    const openaiMessages = this.toOpenAIMessages(sanitizedMessages)

    // Clamp maxTokens to at least 1
    const maxTokens = Math.max(1, params.maxTokens ?? 4096)

    try {
      const stream = await client.chat.completions.create({
        model: resolvedModel,
        messages: openaiMessages,
        max_tokens: maxTokens,
        temperature: params.temperature ?? 0.7,
        tools: params.tools as OpenAI.Chat.Completions.ChatCompletionTool[] | undefined,
        tool_choice: params.tools ? 'auto' : undefined,
        stream: true
      }, {
        signal: params.signal // Pass AbortSignal to OpenAI SDK
      })

      // Accumulate tool calls across chunks
      const accumulatedToolCalls = new Map<number, ToolCallDelta>()
      let finishReason: 'stop' | 'tool_calls' | 'length' = 'stop'

      for await (const chunk of stream) {
        // Check for abort
        if (params.signal?.aborted) {
          log.info('Stream aborted by client')
          return
        }

        const delta = chunk.choices[0]?.delta
        const chunkFinishReason = chunk.choices[0]?.finish_reason

        // Track finish reason
        if (chunkFinishReason) {
          if (chunkFinishReason === 'tool_calls') {
            finishReason = 'tool_calls'
          } else if (chunkFinishReason === 'length') {
            finishReason = 'length'
          }
        }

        // Yield content chunks immediately
        if (delta?.content) {
          yield { content: delta.content, toolCalls: [], isDone: false }
        }

        // Accumulate tool call deltas by index
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            this.accumulateToolCallDelta(accumulatedToolCalls, tc)
          }
        }
      }

      // Final chunk with accumulated tool calls
      yield {
        content: null,
        toolCalls: this.buildFinalToolCalls(accumulatedToolCalls),
        isDone: true,
        finishReason
      }
    } catch (error) {
      // Handle abort gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        log.info('Stream aborted')
        return
      }

      // Log error for debugging
      log.error({ err: error }, 'Stream error')

      // Yield error as final chunk
      yield {
        content: null,
        toolCalls: [],
        isDone: true,
        finishReason: 'error'
      }
    }
  }

  /**
   * Test connection to the provider
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10
      })

      if (response.finishReason === 'error') {
        return {
          success: false,
          message: response.content ?? 'Connection failed'
        }
      }

      return {
        success: true,
        message: `Connected successfully to ${this.defaultModel}`
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
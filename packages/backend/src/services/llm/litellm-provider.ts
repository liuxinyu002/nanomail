/**
 * LiteLLM Provider - Multi-provider support via OpenAI-compatible API
 * Reference: nanobot/providers/litellm_provider.py
 */

import OpenAI from 'openai'
import { LLMProvider } from './base-provider'
import { ProviderRegistry } from './provider-registry'
import type { LLMResponse, ChatParams, ChatMessage, ProviderSpec, LLMProviderConfig, ToolCallRequest } from './types'

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
 * LiteLLM Provider using OpenAI SDK
 * Supports multiple providers through a unified interface
 */
export class LiteLLMProvider extends LLMProvider {
  private client: OpenAI
  private defaultModel: string
  private providerRegistry: ProviderRegistry

  constructor(config: LLMProviderConfig & { defaultModel?: string } = {}) {
    super(config)

    this.providerRegistry = new ProviderRegistry()
    this.defaultModel = config.defaultModel ?? 'gpt-4o-mini'

    // Initialize OpenAI client
    // Ollama doesn't need a real API key
    const apiKey = config.apiKey ?? 'ollama'

    this.client = new OpenAI({
      apiKey,
      baseURL: config.apiBase
    })
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
   * Apply provider-specific model prefix
   * Reference: nanobot/providers/litellm_provider.py - _apply_prefix()
   */
  applyModelPrefix(model: string): string {
    const spec = this.detectProvider(model)

    if (!spec || !spec.litellmPrefix) {
      return model
    }

    // Check if already has the prefix
    if (model.startsWith(`${spec.litellmPrefix}/`)) {
      return model
    }

    return `${spec.litellmPrefix}/${model}`
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
    const message = choice.message

    // Parse tool calls
    const toolCalls: ToolCallRequest[] = []
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        let args = tc.function.arguments
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args)
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
   * Send a chat completion request
   * Reference: nanobot/providers/litellm_provider.py - chat()
   */
  async chat(params: ChatParams): Promise<LLMResponse> {
    const model = params.model ?? this.getDefaultModel()
    const resolvedModel = this.applyModelPrefix(model)

    // Sanitize messages
    const sanitizedMessages = this.sanitizeMessages(params.messages)
    const openaiMessages = this.toOpenAIMessages(sanitizedMessages)

    // Clamp maxTokens to at least 1
    const maxTokens = Math.max(1, params.maxTokens ?? 4096)

    try {
      const response = await this.client.chat.completions.create({
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
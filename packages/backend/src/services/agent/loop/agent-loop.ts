/**
 * ReAct Agent Loop Core
 * Reference: nanobot/agent/loop.py
 *
 * Core pattern: Thought -> Action -> Observation -> Thought...
 *
 * Uses AsyncGenerator for streaming support.
 * Supports role-based context building via ContextBuilder.
 */

import type { LLMResponse, ToolCallRequest } from '../../llm/types'
import type { LLMProvider } from '../../llm/base-provider'
import type { ToolRegistry } from '../tools/registry'
import type { ContextBuilder, AgentRole } from '../context/types'
import type { MemoryStore } from '../memory/types'
import type {
  AgentMessage,
  AgentConfig,
  ConversationEvent,
  AgentContext,
  ToolCallData,
  ErrorData,
  ToolDeps
} from './types'
import type { Logger } from '../../../config/logger'
import type { ChatMessage } from '@nanomail/shared'
import {
  AGENT_PRESETS,
  AgentPreset,
  DEFAULT_AGENT_CONFIG,
  MAX_STEPS
} from './types'
import { createLogger } from '../../../config/logger'
import { MessageTokenTruncator } from './token-truncator'

// Re-export ToolDeps for convenience
export type { ToolDeps } from './types'

/**
 * Dynamic tool sets for each agent role
 * Maps agent roles to their available tools
 */
const TOOL_SETS: Record<AgentRole, string[]> = {
  'todo-agent': ['createTodo', 'updateTodo', 'deleteTodo'],
  'email-analyzer': ['search_local_emails', 'summarize_email']
}

/**
 * ReAct Agent Loop
 * Reference: nanobot/agent/loop.py - AgentLoop class
 *
 * Core pattern: Thought -> Action -> Observation -> Thought...
 *
 * Note on maxIterations:
 * - For email drafts, 5-7 iterations is sufficient
 * - If agent can't complete in 7 steps, the prompt or tools need improvement
 * - Lower limit prevents infinite loops and reduces API costs
 */
export class AgentLoop {
  private provider: LLMProvider
  private toolRegistry: ToolRegistry
  private contextBuilder: ContextBuilder
  private _memoryStore: MemoryStore // Prefix with underscore to indicate intentionally unused
  private config: AgentConfig
  private agentRole: AgentRole
  private signal?: AbortSignal
  private readonly log: Logger = createLogger('AgentLoop')
  private readonly truncator: MessageTokenTruncator = new MessageTokenTruncator()

  /**
   * Approximate token count for a message
   * Uses character-based estimation: ~4 chars per token (rough GPT tokenizer estimate)
   * This is a conservative estimate that works well for truncation purposes
   *
   * @param msg - Message to count tokens for
   * @returns Approximate token count
   */
  private countTokens(msg: AgentMessage): number {
    let count = 0

    // Count content tokens
    if (msg.content) {
      count += Math.ceil(msg.content.length / 4)
    }

    // Count tool calls tokens
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        count += Math.ceil(tc.name.length / 4)
        count += Math.ceil(JSON.stringify(tc.arguments).length / 4)
        count += 10 // overhead for id, structure
      }
    }

    // Count tool call id
    if (msg.toolCallId) {
      count += Math.ceil(msg.toolCallId.length / 4)
    }

    // Add role/metadata overhead
    return count + 10
  }

  /**
   * Truncate conversation messages to fit within memory window
   * Preserves tool_call/tool_output pairing during truncation
   *
   * @param messages - Messages to truncate
   * @returns Truncated messages array
   */
  private truncateMessages(messages: AgentMessage[]): AgentMessage[] {
    if (messages.length <= this.config.memoryWindow) {
      // Return a copy to avoid reference issues when caller clears the original array
      return [...messages]
    }

    // Separate system message (always keep)
    const systemMessage = messages.find(m => m.role === 'system')
    const nonSystemMessages = messages.filter(m => m.role !== 'system')

    // Calculate max tokens based on memoryWindow and avg tokens per message
    // Use a reasonable token budget: memoryWindow * ~500 tokens per message
    const maxTokens = this.config.memoryWindow * 500

    // Truncate non-system messages
    const truncated = this.truncator.truncate(
      nonSystemMessages as unknown as ChatMessage[],
      maxTokens,
      (msg) => this.countTokens(msg as unknown as AgentMessage)
    ) as unknown as AgentMessage[]

    // Log truncation if messages were removed
    if (truncated.length < nonSystemMessages.length) {
      this.log.info(
        { original: nonSystemMessages.length, truncated: truncated.length },
        'Message history truncated to fit memory window'
      )
    }

    // Return with system message at the beginning
    return systemMessage ? [systemMessage, ...truncated] : truncated
  }

  constructor(params: {
    provider: LLMProvider
    toolRegistry: ToolRegistry
    contextBuilder: ContextBuilder
    memoryStore: MemoryStore
    config?: Partial<AgentConfig> & { preset?: AgentPreset }
    agentRole?: AgentRole // Default: 'todo-agent'
    signal?: AbortSignal // NEW: AbortSignal for cancellation
  }) {
    // Apply preset defaults if specified
    const presetConfig = params.config?.preset
      ? AGENT_PRESETS[params.config.preset]
      : null

    this.config = {
      model: params.config?.model ?? DEFAULT_AGENT_CONFIG.model,
      temperature: params.config?.temperature ?? presetConfig?.temperature ?? DEFAULT_AGENT_CONFIG.temperature,
      maxTokens: params.config?.maxTokens ?? DEFAULT_AGENT_CONFIG.maxTokens,
      maxIterations: params.config?.maxIterations ?? presetConfig?.maxIterations ?? DEFAULT_AGENT_CONFIG.maxIterations,
      memoryWindow: params.config?.memoryWindow ?? DEFAULT_AGENT_CONFIG.memoryWindow,
      reasoningEffort: params.config?.reasoningEffort
    }

    this.provider = params.provider
    this.toolRegistry = params.toolRegistry
    this.contextBuilder = params.contextBuilder
    this._memoryStore = params.memoryStore
    this.agentRole = params.agentRole ?? 'todo-agent'
    this.signal = params.signal
  }

  /**
   * Get current agent configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config }
  }

  /**
   * Get current agent role
   */
  getAgentRole(): AgentRole {
    return this.agentRole
  }

  /**
   * Run the AI agent loop
   *
   * This is the main interface that supports:
   * - Multiple agent roles (todo-agent, email-analyzer, and future roles)
   * - SSE streaming with ConversationEvent types
   * - Dynamic tool loading based on role
   * - Tool execution error feedback to LLM
   *
   * @param messages - Chat history from frontend (ChatMessage[])
   * @param context - Agent context with role, sessionId, etc.
   * @param deps - Tool dependencies (dataSource, caches)
   * @returns AsyncGenerator yielding ConversationEvent objects
   */
  async *run(
    messages: ChatMessage[],
    context: AgentContext
  ): AsyncGenerator<ConversationEvent, void, unknown> {
    const { role, sessionId, messageId, currentTime, timeZone, sourcePage } = context
    const timestamp = () => new Date().toISOString()

    // Yield session_start event
    yield {
      type: 'session_start',
      sessionId,
      messageId,
      timestamp: timestamp(),
      data: null
    }

    // Check for early abort
    if (this.signal?.aborted) {
      yield {
        type: 'error',
        sessionId,
        messageId,
        timestamp: timestamp(),
        data: {
          code: 'ABORTED',
          message: 'Request was cancelled',
          details: {}
        } as ErrorData
      }
      return
    }

    // Build system prompt with time context
    const systemPrompt = await this.buildSystemPrompt(role, currentTime, timeZone, sourcePage)

    // Convert ChatMessage[] to internal format for LLM
    // Note: ChatMessage.toolCalls uses OpenAI format { id, type, function: { name, arguments } }
    // while ToolCallRequest uses { id, name, arguments }
    let conversationMessages: AgentMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'tool',
        content: msg.content,
        toolCalls: msg.toolCalls?.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments
        })),
        toolCallId: msg.toolCallId
      }))
    ]

    // Apply token truncation to fit within memory window
    // This protects against token limit exceeded errors from LLM API
    conversationMessages = this.truncateMessages(conversationMessages)

    // Get tool definitions for this role
    const tools = this.toolRegistry.getDefinitions()

    // Track iteration count
    // Use MAX_STEPS as hard safety limit to prevent infinite loops
    let currentStep = 0
    const maxSteps = Math.min(this.config.maxIterations, MAX_STEPS)

    try {
      while (currentStep < maxSteps) {
        currentStep++

        // Check abort before each iteration
        if (this.signal?.aborted) {
          yield {
            type: 'error',
            sessionId,
            messageId,
            timestamp: timestamp(),
            data: {
              code: 'ABORTED',
              message: 'Request was cancelled',
              details: { step: currentStep }
            } as ErrorData
          }
          return
        }

        // Call LLM with streaming
        let accumulatedContent = ''
        let finalToolCalls: ToolCallRequest[] = []
        let finishReason: LLMResponse['finishReason'] = 'stop'

        try {
          for await (const chunk of this.provider.chatStream({
            messages: conversationMessages,
            tools,
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
            reasoningEffort: this.config.reasoningEffort,
            signal: this.signal
          })) {
            // Check abort during streaming
            if (this.signal?.aborted) {
              yield {
                type: 'error',
                sessionId,
                messageId,
                timestamp: timestamp(),
                data: {
                  code: 'ABORTED',
                  message: 'Request was cancelled during streaming',
                  details: { step: currentStep }
                } as ErrorData
              }
              return
            }

            // Accumulate content
            if (chunk.content) {
              accumulatedContent += chunk.content
            }

            // Capture final tool calls
            if (chunk.isDone) {
              finalToolCalls = chunk.toolCalls
              finishReason = chunk.finishReason ?? 'stop'
            }
          }
        } catch (streamError) {
          this.log.error({ err: streamError }, 'LLM streaming error')
          yield {
            type: 'error',
            sessionId,
            messageId,
            timestamp: timestamp(),
            data: {
              code: 'LLM_ERROR',
              message: streamError instanceof Error ? streamError.message : 'LLM streaming error',
              details: { step: currentStep }
            } as ErrorData
          }
          return
        }

        // Handle LLM error response
        if (finishReason === 'error') {
          yield {
            type: 'error',
            sessionId,
            messageId,
            timestamp: timestamp(),
            data: {
              code: 'LLM_RESPONSE_ERROR',
              message: accumulatedContent || 'LLM returned an error',
              details: { step: currentStep }
            } as ErrorData
          }
          return
        }

        // No tool calls means final answer - yield result_chunks and session_end, then exit
        if (finalToolCalls.length === 0) {
          // Yield the final content as result_chunks
          if (accumulatedContent) {
            yield {
              type: 'result_chunk',
              sessionId,
              messageId,
              timestamp: timestamp(),
              data: { content: accumulatedContent }
            }
          }
          yield {
            type: 'session_end',
            sessionId,
            messageId,
            timestamp: timestamp(),
            data: null
          }
          return
        }

        // Process tool calls
        // Add assistant message with tool calls to conversation
        conversationMessages.push({
          role: 'assistant',
          content: accumulatedContent || null,
          toolCalls: finalToolCalls
        })

        // Execute each tool
        for (const toolCall of finalToolCalls) {
          // Yield tool_call_start
          yield {
            type: 'tool_call_start',
            sessionId,
            messageId,
            timestamp: timestamp(),
            data: {
              toolName: toolCall.name,
              toolInput: toolCall.arguments as Record<string, unknown>
            } as ToolCallData
          }

          // Execute tool with error handling
          let toolOutput: Record<string, unknown>
          try {
            const result = await this.toolRegistry.execute(toolCall.name, toolCall.arguments)
            // Parse JSON result if possible
            try {
              toolOutput = JSON.parse(result)
            } catch {
              toolOutput = { result }
            }
          } catch (error) {
            // CRITICAL: Feed error back to LLM, don't terminate
            toolOutput = {
              error: error instanceof Error ? error.message : String(error),
              status: 'failed'
            }
            this.log.warn(
              { toolCallId: toolCall.id, toolName: toolCall.name, error },
              'Tool execution failed, feeding error back to LLM'
            )
          }

          // Yield tool_call_end with output
          yield {
            type: 'tool_call_end',
            sessionId,
            messageId,
            timestamp: timestamp(),
            data: {
              toolName: toolCall.name,
              toolInput: toolCall.arguments as Record<string, unknown>,
              toolOutput
            } as ToolCallData
          }

          // Add tool result to conversation for next LLM call
          const toolResultMessage = {
            role: 'tool' as const,
            content: JSON.stringify(toolOutput),
            toolCallId: toolCall.id
          }
          conversationMessages.push(toolResultMessage)

          // DEBUG: Log tool result sent to LLM
          this.log.debug({
            toolName: toolCall.name,
            toolCallId: toolCall.id,
            toolResult: toolOutput,
            messagePreview: JSON.stringify(toolOutput).substring(0, 200)
          }, '[Tool Result] Sent to LLM')
        }

        // Apply truncation after adding tool results to prevent context overflow
        // This ensures long conversations stay within memory limits
        const truncatedMessages = this.truncateMessages(conversationMessages)
        conversationMessages.length = 0
        conversationMessages.push(...truncatedMessages)

        // Loop continues - LLM will be called again with tool results
        this.log.debug({ step: currentStep, toolCallsProcessed: finalToolCalls.length }, 'Re-prompting with tool results')
      }

      // MAX_STEPS exceeded
      this.log.warn({ maxSteps, role }, 'MAX_STEPS exceeded')
      yield {
        type: 'error',
        sessionId,
        messageId,
        timestamp: timestamp(),
        data: {
          code: 'MAX_STEPS_EXCEEDED',
          message: 'AI 思考时间过长，已自动终止。请尝试简化您的问题。',
          details: { steps: maxSteps }
        } as ErrorData
      }
    } catch (error) {
      this.log.error({ err: error }, 'AgentLoop error')
      yield {
        type: 'error',
        sessionId,
        messageId,
        timestamp: timestamp(),
        data: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal error',
          details: {}
        } as ErrorData
      }
    }
  }

  /**
   * Build system prompt with time context
   * Phase 4: Uses ContextBuilder.buildSystemMessage() for consistent formatting
   *
   * @param role - Agent role (e.g., 'todo-agent')
   * @param currentTime - ISO datetime string
   * @param timeZone - User timezone (e.g., 'Asia/Shanghai')
   * @param sourcePage - Optional page context
   */
  private async buildSystemPrompt(
    role: AgentRole,
    currentTime: string,
    timeZone: string,
    sourcePage?: string
  ): Promise<string> {
    // Phase 4: Use buildSystemMessage for consistent formatting
    // This ensures runtime context (currentTime, timeZone) is properly injected
    // with the correct format including "---" separator as per the design spec
    const runtimeContext = {
      currentTime,
      timeZone,
      channel: sourcePage
    }

    // Check for cached prompt first (loaded at startup)
    const cachedPrompt = this.contextBuilder.getCachedPrompt(role)

    if (cachedPrompt) {
      // Use cached prompt with runtime context
      return this.contextBuilder.buildSystemMessage(role, runtimeContext)
    }

    // Fall back to file system loading if not cached
    this.log.debug({ role }, 'No cached prompt found, loading from file system')
    const rolePrompt = await this.contextBuilder.buildSystemPrompt(role, undefined)

    // Build system message with runtime context using the same format
    const timeContext = this.contextBuilder.buildRuntimeContext(runtimeContext)
    return `${rolePrompt}\n\n---\n\n${timeContext}`
  }
}

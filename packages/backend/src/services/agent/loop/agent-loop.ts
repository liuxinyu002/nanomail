/**
 * ReAct Agent Loop Core
 * Reference: nanobot/agent/loop.py
 *
 * Core pattern: Thought -> Action -> Observation -> Thought...
 *
 * Uses AsyncGenerator for streaming support.
 * Supports role-based context building via ContextBuilder.
 */

import type { LLMResponse, ToolCallRequest, TruncationConfig } from '../../llm/types'
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
import { MessageTokenTruncator, DEFAULT_TRUNCATION_OPTIONS } from './token-truncator'
import { TokenEstimator, tokenEstimator } from './token-estimator'
import { ModelRegistry, modelRegistry, MIN_OUTPUT_RESERVE_TOKENS } from '../../llm/model-registry'

// Re-export ToolDeps for convenience
export type { ToolDeps } from './types'

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
  private readonly truncator: MessageTokenTruncator
  private readonly tokenEstimator: TokenEstimator
  private readonly modelRegistry: ModelRegistry
  private readonly truncationConfig: TruncationConfig

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

    // Initialize truncation components
    this.tokenEstimator = new TokenEstimator()
    this.modelRegistry = new ModelRegistry()
    this.truncator = new MessageTokenTruncator({
      maxToolOutputChars: 3000,
      protectedRecentTurns: 3,
      maxMessagesLimit: this.config.memoryWindow
    })

    // Truncation configuration
    this.truncationConfig = {
      safeThreshold: 0.8,
      maxToolOutputChars: 3000,
      protectedRecentTurns: 3,
      maxMessagesLimit: this.config.memoryWindow,
      charsPerTokenEstimate: 4
    }
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
   * Get context window for the current model
   */
  private getContextWindow(): number {
    const modelId = this.config.model
    if (!modelId) {
      return 128000 // Default for most modern models
    }

    // Detect provider from model ID
    const provider = this.detectProviderFromModel(modelId)
    return this.modelRegistry.getContextWindow(modelId, provider)
  }

  /**
   * Detect provider from model ID
   */
  private detectProviderFromModel(modelId: string): string | undefined {
    const modelLower = modelId.toLowerCase()

    if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
      return 'anthropic'
    }
    if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('o3')) {
      return 'openai'
    }
    if (modelLower.includes('deepseek')) {
      return 'deepseek'
    }
    if (modelLower.includes('gemini')) {
      return 'gemini'
    }
    if (modelLower.includes('llama') || modelLower.includes('mistral') || modelLower.includes('qwen')) {
      return 'ollama'
    }

    return undefined
  }

  /**
   * Truncate conversation messages to fit within token limits
   * Uses token-based triggers instead of message count
   *
   * @param messages - Messages to truncate
   * @returns Truncated messages array
   */
  private truncateMessages(messages: AgentMessage[]): AgentMessage[] {
    if (messages.length === 0) return messages

    const config = this.truncationConfig

    // Step 1: Calculate actual token count
    const totalTokens = this.tokenEstimator.estimateTotalTokens(messages)

    // Step 2: Get model context window, calculate safe limit
    const contextWindow = this.getContextWindow()
    const safeLimit = Math.floor(contextWindow * config.safeThreshold) - MIN_OUTPUT_RESERVE_TOKENS

    // Step 3: Check hybrid trigger conditions
    const needTruncate =
      messages.length > config.maxMessagesLimit ||  // Message count exceeded
      totalTokens > safeLimit                        // Token count exceeded

    if (!needTruncate) {
      // Return a copy to avoid reference issues
      return [...messages]
    }

    // Log truncation trigger reason
    this.log.info(
      {
        totalTokens,
        safeLimit,
        messageCount: messages.length,
        maxMessages: config.maxMessagesLimit,
        triggerReason: messages.length > config.maxMessagesLimit ? 'message_count' : 'token_count',
        contextWindow
      },
      '[Truncation] Starting message truncation'
    )

    // Step 4: Execute truncation with fallback
    const truncated = this.truncator.truncateWithFallback(
      messages as unknown as ChatMessage[],
      safeLimit,
      (msg) => this.tokenEstimator.estimateMessageTokens(msg as unknown as AgentMessage)
    ) as unknown as AgentMessage[]

    // Log result
    const newTokens = this.tokenEstimator.estimateTotalTokens(truncated)
    this.log.info(
      {
        originalMessages: messages.length,
        truncatedMessages: truncated.length,
        originalTokens: totalTokens,
        truncatedTokens: newTokens
      },
      '[Truncation] Completed'
    )

    return truncated
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

            // Accumulate content and yield incremental chunks
            if (chunk.content) {
              accumulatedContent += chunk.content  // 保留累积，后续保存上下文需要

              // 立即发送增量内容实现流式响应
              yield {
                type: 'result_chunk',
                sessionId,
                messageId,
                timestamp: timestamp(),
                data: { content: chunk.content }
              }
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

        // No tool calls means final answer - end session and exit
        if (finalToolCalls.length === 0) {
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
              toolCallId: toolCall.id,
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
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              toolInput: toolCall.arguments as Record<string, unknown>,
              toolOutput
            } as ToolCallData
          }

          // Add tool result to conversation for next LLM call
          // Pre-truncate large tool outputs to prevent context overflow
          const maxToolOutputChars = this.truncationConfig.maxToolOutputChars
          const toolResultContent = this.truncator.truncateToolOutputContent(toolOutput, maxToolOutputChars)
          const toolResultMessage = {
            role: 'tool' as const,
            content: toolResultContent,  // Already truncated string
            toolCallId: toolCall.id
          }
          conversationMessages.push(toolResultMessage)

          // DEBUG: Log tool result sent to LLM
          this.log.debug({
            toolName: toolCall.name,
            toolCallId: toolCall.id,
            toolResult: toolOutput,
            messagePreview: toolResultContent.substring(0, 200),
            wasTruncated: toolResultContent.includes('(truncated)')
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

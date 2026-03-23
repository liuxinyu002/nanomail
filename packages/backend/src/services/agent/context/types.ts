/**
 * Context Builder Service - Role-based Prompt Assembly
 * Reference: docs/phase_2/plans/plan_3_agent.md
 *
 * Builds system prompts and message arrays for LLM interactions.
 * Supports role-based prompt assembly with required/optional file handling.
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { Logger } from '../../../config/logger'
import type { LLMResponse, ToolCallRequest } from '../../llm/types'
import { createLogger } from '../../../config/logger'

/**
 * Agent role type
 * Note: 'draft-agent' has been removed - use 'todo-agent' instead
 */
export type AgentRole = 'email-analyzer' | 'todo-agent'

/**
 * Role configuration for prompt assembly
 */
export interface RoleConfig {
  files: string[]      // Array order follows primacy-recency effect
  required: string[]   // Missing required files throw errors
}

/**
 * Runtime context options
 */
export interface RuntimeContext {
  channel?: string
  chatId?: string
  currentTime?: Date | string
  timeZone?: string
}

/**
 * Message structure for chat history
 */
export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCallRequest[]
  toolCallId?: string
}

/**
 * Full message structure including system messages
 */
export interface ContextMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  toolCalls?: ToolCallRequest[]
  toolCallId?: string
}

/**
 * Loaded file with name and content
 */
interface LoadedFile {
  name: string
  content: string | null
}

/**
 * Memory safeguard threshold (characters)
 * Prevents MEMORY.md from exploding token count
 */
const MEMORY_MAX_LENGTH = 5000

/**
 * Context builder for constructing system prompts and message history
 * Supports role-based prompt assembly following the primacy-recency effect.
 */
export class ContextBuilder {
  private promptsDir: string
  private readonly log: Logger = createLogger('ContextBuilder')

  /**
   * In-memory cache for prompt files
   * Populated at bootstrap time to avoid file I/O on every request
   */
  private promptCache: Map<string, string> = new Map()

  /**
   * Role configuration mapping
   * Files array order follows primacy-recency effect:
   * 1. AGENTS.md first (global rules)
   * 2. Personality/Memory in middle
   * 3. Task-specific rules near end
   * 4. TOOLS.md last (tool specifications)
   */
  static readonly ROLE_CONFIG: Record<AgentRole, RoleConfig> = {
    'email-analyzer': {
      files: ['AGENTS.md', 'USER.md', 'email-analyzer.md', 'TOOLS.md'],
      required: ['AGENTS.md', 'email-analyzer.md']
      // Excludes SOUL.md and MEMORY.md for objectivity
    },
    'todo-agent': {
      files: ['AGENTS.md', 'USER.md', 'todo-agent.md', 'TOOLS.md'],
      required: ['AGENTS.md', 'todo-agent.md']
    }
  }

  /**
   * Constructor with flexible path resolution
   * Priority: constructor param > PROMPTS_DIR env var > default path
   */
  constructor(promptsDir?: string) {
    this.promptsDir = promptsDir
      ?? process.env.PROMPTS_DIR
      ?? path.resolve(__dirname, '../prompts')

    // Log initialization for debugging
    this.log.info({
      promptsDir: this.promptsDir,
      userId: 'default'  // Current version fixed to 'default'
    }, 'ContextBuilder initialized')
  }

  /**
   * Get the current prompts directory (for testing)
   */
  getPromptsDir(): string {
    return this.promptsDir
  }

  /**
   * Build the complete system prompt for a specific agent role
   * Uses Promise.all for concurrent file reads
   */
  async buildSystemPrompt(
    agentRole: AgentRole = 'todo-agent',
    _userId?: string  // Reserved for multi-user support, currently unused
  ): Promise<string> {
    const roleConfig = ContextBuilder.ROLE_CONFIG[agentRole]

    // Load all prompt files concurrently
    const loadedFiles = await this.loadPromptFiles(roleConfig.files, roleConfig.required)

    // Apply memory safeguard if MEMORY.md is present and too long
    const processedFiles = loadedFiles.map(file => this.applyMemorySafeguard(file))

    // Filter out null/empty content
    const validFiles = processedFiles.filter(f => f.content && f.content.trim())

    // Assemble with XML tag wrapping (not Markdown headers - avoids attention drift)
    const assembled = validFiles
      .map(f => {
        const tagName = f.name.replace('.md', '').toLowerCase()
        return `<${tagName}>\n${f.content}\n</${tagName}>`
      })
      .join('\n\n')

    return assembled
  }

  /**
   * Build message array for LLM
   * System prompt (all .md files) -> role: "system"
   * User input (runtime content) -> role: "user"
   */
  async buildMessages(params: {
    agentRole?: AgentRole
    userId?: string
    history: ContextMessage[]
    currentMessage: string
    runtimeContext?: RuntimeContext
  }): Promise<ContextMessage[]> {
    const role = params.agentRole ?? 'email-analyzer'
    const systemPrompt = await this.buildSystemPrompt(role, params.userId)
    const runtimeCtx = this.buildRuntimeContext(params.runtimeContext)

    const userContent = runtimeCtx
      ? `${runtimeCtx}\n\n${params.currentMessage}`
      : params.currentMessage

    return [
      { role: 'system', content: systemPrompt },
      ...params.history,
      { role: 'user', content: userContent }
    ]
  }

  /**
   * Build runtime context with current time, channel, etc.
   */
  buildRuntimeContext(ctx?: RuntimeContext): string {
    if (!ctx) return ''

    const parts: string[] = []

    // CRITICAL: Always include currentTime - required for time parsing
    // Supports both Date objects and ISO strings
    const currentTime = ctx.currentTime
      ? (ctx.currentTime instanceof Date ? ctx.currentTime.toISOString() : ctx.currentTime)
      : new Date().toISOString()
    parts.push(`Current time: ${currentTime}`)

    if (ctx.timeZone) parts.push(`Time zone: ${ctx.timeZone}`)
    if (ctx.channel) parts.push(`Channel: ${ctx.channel}`)
    if (ctx.chatId) parts.push(`Chat ID: ${ctx.chatId}`)

    return `[Runtime Context]\n${parts.join('\n')}`
  }

  /**
   * Set a cached prompt (called from bootstrap)
   * @param name - Prompt name (e.g., 'todo-agent')
   * @param content - Prompt content
   */
  setCachedPrompt(name: string, content: string): void {
    this.promptCache.set(name, content)
    this.log.info({ promptName: name }, 'Prompt cached in memory')
  }

  /**
   * Get a cached prompt
   * @param name - Prompt name
   * @returns Cached prompt content or undefined if not found
   */
  getCachedPrompt(name: string): string | undefined {
    return this.promptCache.get(name)
  }

  /**
   * Build complete system message with prompt and runtime context
   * This is the main method to construct the final system message for LLM.
   *
   * @param promptName - Name of cached prompt (e.g., 'todo-agent')
   * @param ctx - Runtime context with currentTime, timeZone, etc.
   * @returns Complete system message content
   */
  buildSystemMessage(promptName: string, ctx?: RuntimeContext): string {
    const basePrompt = this.getCachedPrompt(promptName)

    if (!basePrompt) {
      this.log.error({ promptName }, 'Prompt not found in cache')
      throw new Error(`Prompt '${promptName}' not found in cache`)
    }

    const runtimeContext = this.buildRuntimeContext(ctx)

    // Concatenate base prompt with runtime context
    // LLM will use this to understand current time and parse relative dates
    return `${basePrompt}\n\n---\n\n${runtimeContext}`
  }

  /**
   * Add assistant message with tool calls to history
   */
  addAssistantMessage(
    messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }>,
    response: LLMResponse
  ): Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> {
    const message: { role: string; content: string | null; toolCalls?: ToolCallRequest[] } = {
      role: 'assistant',
      content: response.content
    }

    // Only add toolCalls if there are any
    if (response.toolCalls.length > 0) {
      message.toolCalls = response.toolCalls
    }

    return [...messages, message]
  }

  /**
   * Add tool result to message history
   */
  addToolResult(
    messages: Array<{ role: string; content: string | null; toolCallId?: string }>,
    toolCallId: string,
    result: string
  ): Array<{ role: string; content: string | null; toolCallId?: string }> {
    return [
      ...messages,
      {
        role: 'tool',
        content: result || '(empty)', // Sanitize empty content
        toolCallId
      }
    ]
  }

  /**
   * Load prompt files concurrently using Promise.all
   * Throws error for missing required files, gracefully skips optional files
   */
  private async loadPromptFiles(
    files: string[],
    required: string[]
  ): Promise<LoadedFile[]> {
    const results = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(this.promptsDir, filename)
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          return { name: filename, content }
        } catch {
          // Required file missing: throw error to fail fast
          if (required.includes(filename)) {
            throw new Error(`Required prompt file missing: ${filename}`)
          }
          // Optional file missing: log warning and skip
          this.log.warn({ file: filename }, 'Optional prompt file not found, skipping')
          return { name: filename, content: null }
        }
      })
    )

    return results
  }

  /**
   * Apply memory safeguard to prevent token explosion
   * Truncates MEMORY.md to last 5000 characters if too long
   * (Most recent memories are more relevant)
   */
  private applyMemorySafeguard(file: LoadedFile): LoadedFile {
    if (file.name === 'MEMORY.md' && file.content && file.content.length > MEMORY_MAX_LENGTH) {
      const originalLength = file.content.length
      // Keep most recent content (tail)
      const truncatedContent = file.content.slice(-MEMORY_MAX_LENGTH)

      this.log.warn({
        file: file.name,
        originalLength,
        truncatedLength: truncatedContent.length,
        threshold: MEMORY_MAX_LENGTH
      }, 'MEMORY.md exceeded safe length, truncated to most recent content')

      return { ...file, content: truncatedContent }
    }
    return file
  }
}
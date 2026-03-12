/**
 * Context Builder Service
 * Reference: nanobot/agent/context.py
 *
 * Builds system prompts and message arrays for LLM interactions.
 * Handles bootstrap files, memory context, skills, and runtime context.
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { LLMResponse, ToolCallRequest } from '../../llm/types'
import type { MemoryStore } from '../memory/types'

/**
 * SkillsLoader interface for dependency injection
 */
export interface SkillsLoader {
  buildSkillsSummary(): string
  getAlwaysSkills(): string[]
  loadSkillsForContext(names: string[]): string
}

/**
 * Runtime context options
 */
export interface RuntimeContext {
  channel?: string
  chatId?: string
  currentTime?: Date
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
 * Context builder for constructing system prompts and message history
 * Reference: nanobot/agent/context.py - ContextBuilder class
 */
export class ContextBuilder {
  private workspacePath: string
  private memoryStore: MemoryStore
  private skillsLoader: SkillsLoader

  /**
   * Bootstrap files loaded in order
   * Reference: nanobot/agent/context.py - BOOTSTRAP_FILES
   */
  private static readonly BOOTSTRAP_FILES = [
    'AGENTS.md', // Agent identity
    'SOUL.md', // Core personality
    'USER.md', // User preferences
    'TOOLS.md' // Tool usage guidelines
  ]

  constructor(
    workspacePath: string,
    memoryStore: MemoryStore,
    skillsLoader: SkillsLoader
  ) {
    this.workspacePath = workspacePath
    this.memoryStore = memoryStore
    this.skillsLoader = skillsLoader
  }

  /**
   * Build the complete system prompt
   * Reference: nanobot/agent/context.py - build_system_prompt()
   */
  async buildSystemPrompt(): Promise<string> {
    const parts: string[] = []

    // Add identity
    const identity = await this.getIdentity()
    parts.push(identity)

    // Load bootstrap files
    const bootstrap = await this.loadBootstrapFiles()
    if (bootstrap) {
      parts.push(bootstrap)
    }

    // Add memory context
    const memory = await this.memoryStore.getMemoryContext()
    if (memory) {
      parts.push(`# Memory\n\n${memory}`)
    }

    // Add skills summary
    const skillsSummary = this.skillsLoader.buildSkillsSummary()
    if (skillsSummary) {
      parts.push(`# Skills\n\n${skillsSummary}`)
    }

    return parts.filter(Boolean).join('\n\n---\n\n')
  }

  /**
   * Build message array for LLM
   * Reference: nanobot/agent/context.py - build_messages()
   */
  async buildMessages(params: {
    history: ContextMessage[]
    currentMessage: string
    runtimeContext?: RuntimeContext
  }): Promise<ContextMessage[]> {
    const systemPrompt = await this.buildSystemPrompt()
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
   * Reference: nanobot/agent/context.py - _build_runtime_context()
   */
  buildRuntimeContext(ctx?: RuntimeContext): string {
    if (!ctx) return ''

    const parts: string[] = []
    const currentTime = ctx.currentTime?.toISOString() ?? new Date().toISOString()
    parts.push(`Current time: ${currentTime}`)
    if (ctx.channel) parts.push(`Channel: ${ctx.channel}`)
    if (ctx.chatId) parts.push(`Chat ID: ${ctx.chatId}`)

    return `[Runtime Context]\n${parts.join('\n')}`
  }

  /**
   * Add assistant message with tool calls to history
   * Reference: nanobot/agent/context.py - add_assistant_message()
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
   * Reference: nanobot/agent/context.py - add_tool_result()
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
   * Get the core identity section
   * Reference: nanobot/agent/context.py - _get_identity()
   */
  async getIdentity(): Promise<string> {
    const platform = process.platform
    const nodeVersion = process.version

    return `# nanobot

You are nanobot, a helpful AI assistant.

## Runtime
${platform} ${process.arch}, Node.js ${nodeVersion}

## Workspace
Your workspace is at: ${this.workspacePath}
- Long-term memory: ${this.workspacePath}/memory/MEMORY.md (write important facts here)
- History log: ${this.workspacePath}/memory/HISTORY.md (grep-searchable)
- Custom skills: ${this.workspacePath}/skills/{skill-name}/SKILL.md

## nanobot Guidelines
- State intent before tool calls, but NEVER predict or claim results before receiving them.
- Before modifying a file, read it first. Do not assume files or directories exist.
- After writing or editing a file, re-read it if accuracy matters.
- If a tool call fails, analyze the error before retrying with a different approach.
- Ask for clarification when the request is ambiguous.`
  }

  /**
   * Load all bootstrap files from workspace
   * Reference: nanobot/agent/context.py - _load_bootstrap_files()
   */
  async loadBootstrapFiles(): Promise<string> {
    const parts: string[] = []

    for (const filename of ContextBuilder.BOOTSTRAP_FILES) {
      const filePath = path.join(this.workspacePath, filename)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        if (content.trim()) {
          parts.push(`## ${filename}\n\n${content}`)
        }
      } catch {
        // File doesn't exist, skip it
      }
    }

    return parts.join('\n\n')
  }
}
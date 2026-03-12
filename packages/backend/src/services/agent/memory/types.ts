/**
 * Memory Store Service
 * Reference: nanobot/agent/memory.py
 *
 * Manages long-term memory and conversation history with thread-safe file operations.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { createLogger, type Logger } from '../../../config/logger.js'

/**
 * Tool call record for history
 */
export interface ToolCallRecord {
  name: string
  result: string
}

/**
 * Turn record for conversation history
 */
export interface TurnRecord {
  timestamp: string
  userMessage: string
  assistantMessage: string
  toolCalls?: ToolCallRecord[]
}

/**
 * History entry (parsed from JSONL)
 */
export interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Simple async mutex for thread-safe file operations
 */
class AsyncMutex {
  private locked = false
  private queue: Array<() => void> = []

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true
      return
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve)
    })
  }

  release(): void {
    const next = this.queue.shift()
    if (next) {
      next()
    } else {
      this.locked = false
    }
  }
}

/**
 * Memory store for managing long-term memory and conversation history
 * Reference: nanobot/agent/memory.py - Memory class
 */
export class MemoryStore {
  private readonly log: Logger = createLogger('MemoryStore')
  private memoryPath: string
  private historyPath: string
  private memoryMutex: AsyncMutex
  private historyMutex: AsyncMutex

  // Maximum size for tool results before truncation (10KB)
  private static readonly MAX_TOOL_RESULT_SIZE = 10000

  constructor(workspacePath: string) {
    this.memoryPath = path.join(workspacePath, 'memory', 'MEMORY.md')
    this.historyPath = path.join(workspacePath, 'memory', 'HISTORY.md')
    this.memoryMutex = new AsyncMutex()
    this.historyMutex = new AsyncMutex()
  }

  /**
   * Get long-term memory context
   * Returns formatted memory content or empty string if file doesn't exist
   */
  async getMemoryContext(): Promise<string> {
    await this.memoryMutex.acquire()
    try {
      const content = await fs.readFile(this.memoryPath, 'utf-8')
      return `[Long-term Memory]\n${content}`
    } catch {
      return ''
    } finally {
      this.memoryMutex.release()
    }
  }

  /**
   * Get conversation history with optional window size
   * Returns last N entries (default 100) from HISTORY.md
   * Returns empty array if file doesn't exist
   * Logs warnings for malformed lines but continues parsing valid entries
   */
  async getHistory(windowSize = 100): Promise<HistoryEntry[]> {
    await this.historyMutex.acquire()
    try {
      const content = await fs.readFile(this.historyPath, 'utf-8')
      const lines = content.trim().split('\n').filter((line) => line.trim())

      // Parse entries with per-line error handling
      const entries: HistoryEntry[] = []
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue
        try {
          entries.push(JSON.parse(line))
        } catch {
          // Log malformed line but continue parsing
          this.log.warn({ line: i + 1 }, 'Skipping malformed JSON')
        }
      }

      // Return last N entries
      const start = Math.max(0, entries.length - windowSize)
      return entries.slice(start)
    } catch (error) {
      // Return empty array for file not found
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return []
      }
      throw error
    } finally {
      this.historyMutex.release()
    }
  }

  /**
   * Save a conversation turn to history
   * Truncates large tool results over 10KB
   */
  async saveTurn(turn: {
    userMessage: string
    assistantMessage: string
    toolCalls?: ToolCallRecord[]
  }): Promise<void> {
    const record: TurnRecord = {
      timestamp: new Date().toISOString(),
      userMessage: turn.userMessage,
      assistantMessage: turn.assistantMessage
    }

    // Truncate large tool results
    if (turn.toolCalls) {
      record.toolCalls = turn.toolCalls.map((tc) => ({
        name: tc.name,
        result: this.truncateToolResult(tc.result)
      }))
    }

    const line = JSON.stringify(record) + '\n'

    await this.historyMutex.acquire()
    try {
      // Ensure directory exists
      const dir = path.dirname(this.historyPath)
      try {
        await fs.mkdir(dir, { recursive: true })
      } catch {
        // Directory already exists
      }

      await fs.appendFile(this.historyPath, line, 'utf-8')
    } finally {
      this.historyMutex.release()
    }
  }

  /**
   * Update long-term memory content
   * Overwrites existing memory file
   */
  async updateMemory(content: string): Promise<void> {
    await this.memoryMutex.acquire()
    try {
      // Ensure directory exists
      const dir = path.dirname(this.memoryPath)
      try {
        await fs.mkdir(dir, { recursive: true })
      } catch {
        // Directory already exists
      }

      await fs.writeFile(this.memoryPath, content, 'utf-8')
    } finally {
      this.memoryMutex.release()
    }
  }

  /**
   * Truncate tool result if over 10KB
   * Returns truncated result with summary
   */
  private truncateToolResult(result: string): string {
    if (result.length <= MemoryStore.MAX_TOOL_RESULT_SIZE) {
      return result
    }

    const totalChars = result.length
    const truncated = result.slice(0, MemoryStore.MAX_TOOL_RESULT_SIZE)

    return `${truncated}\n\n[...truncated from ${totalChars} total chars...]`
  }
}
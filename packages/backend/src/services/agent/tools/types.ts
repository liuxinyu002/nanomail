/**
 * Tool Abstract Base Class with Zod Schema Validation
 * Reference: nanobot/agent/tools/base.py
 */

import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { DataSource } from 'typeorm'

/**
 * OpenAI function tool definition type
 */
export interface FunctionToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
  [key: string]: unknown
}

// ============================================
// Dependency Injection Interface
// ============================================

/**
 * Dependencies injected into tool handlers
 */
export interface ToolDeps {
  dataSource: DataSource
  defaultColumnId?: number // Optional: defaults to 1 if not provided
}

// ============================================
// Tool Result Interface
// ============================================

/**
 * Standard result format returned by all tools
 * Used for LLM to understand tool execution outcome
 */
export interface ToolResult {
  success: boolean
  reason?: 'EMPTY_DESCRIPTION' | 'DESCRIPTION_TOO_LONG' | 'INVALID_DEADLINE_FORMAT' | 'DUPLICATE_DETECTED' | 'TODO_NOT_FOUND' | 'NOTES_TOO_LONG' | 'DATABASE_ERROR'
  warning?: string
  message: string
  todo?: {
    id: number
    description: string
    deadline: string | null
    status: string
    boardColumnId: number
    notes: string | null
    source: 'email' | 'chat' | 'manual'
  }
  existingTodo?: {
    id: number
    description: string
    deadline: string | null
    status: string
    notes: string | null
    source: 'email' | 'chat' | 'manual'
  }
}

// ============================================
// Tool Parameter Interfaces
// ============================================

export interface CreateTodoParams {
  description: string
  deadline?: string | null
  notes?: string | null
  forceCreate?: boolean
}

export interface UpdateTodoParams {
  id: number
  description?: string
  deadline?: string | null
  status?: 'pending' | 'in_progress' | 'completed'
  notes?: string | null
}

export interface DeleteTodoParams {
  id: number
}

/**
 * Abstract Tool base class with Zod schema validation
 * Reference: nanobot/agent/tools/base.py - Tool class
 *
 * Uses Zod for schema validation instead of hand-rolled validators.
 * This provides:
 * - TypeScript type inference
 * - Runtime validation
 * - Automatic JSON Schema generation for LLM
 */
export abstract class Tool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  /**
   * Zod schema defining tool parameters
   * Subclasses MUST override this
   */
  abstract get schema(): TSchema

  /**
   * TypeScript type inferred from Zod schema
   * Use: z.infer<TSchema> in execute method
   */

  /**
   * Unique tool name (e.g., 'search_emails', 'read_file')
   */
  abstract get name(): string

  /**
   * Description shown to LLM for tool selection
   */
  abstract get description(): string

  /**
   * Execute the tool with validated parameters
   * Reference: nanobot/agent/tools/base.py - execute()
   *
   * @param params - Validated parameters from Zod schema
   * @param deps - Optional dependencies (dataSource, caches). Tools requiring deps should check for their presence.
   */
  abstract execute(params: z.infer<TSchema>, deps?: ToolDeps): Promise<string>

  /**
   * Convert to OpenAI function schema using zod-to-json-schema
   * Reference: nanobot/agent/tools/base.py - to_schema()
   */
  toSchema(): FunctionToolDefinition {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: zodToJsonSchema(this.schema, {
          removeAdditionalStrategy: 'strict'
        }) as Record<string, unknown>
      }
    }
  }

  /**
   * Validate and parse parameters using Zod
   * Throws ZodError on validation failure
   */
  parseParams(params: Record<string, unknown>): z.infer<TSchema> {
    return this.schema.parse(params)
  }

  /**
   * Safe parse that returns result or error
   */
  safeParseParams(
    params: Record<string, unknown>
  ): { success: true; data: z.infer<TSchema> } | { success: false; error: z.ZodError } {
    return this.schema.safeParse(params) as
      | { success: true; data: z.infer<TSchema> }
      | { success: false; error: z.ZodError }
  }
}
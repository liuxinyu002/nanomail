/**
 * Tool Abstract Base Class with Zod Schema Validation
 * Reference: nanobot/agent/tools/base.py
 */

import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

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
   */
  abstract execute(params: z.infer<TSchema>): Promise<string>

  /**
   * Convert to OpenAI function schema using zod-to-json-schema
   * Reference: nanobot/agent/tools/base.py - to_schema()
   */
  toSchema(): Record<string, unknown> {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: zodToJsonSchema(this.schema, {
          removeAdditionalStrategy: 'strict'
        })
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
/**
 * Tool Registry - Dynamic tool management
 * Reference: nanobot/agent/tools/registry.py
 */

import type { Tool } from './types'

const ERROR_HINT = '\n\n[Analyze the error above and try a different approach.]'

/**
 * Registry for agent tools
 * Allows dynamic registration and execution of tools
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Register a tool with a custom name
   */
  registerWithName(name: string, tool: Tool): void {
    this.tools.set(name, tool)
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): void {
    this.tools.delete(name)
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get all tool definitions in OpenAI format
   */
  getDefinitions(): Array<Record<string, unknown>> {
    return Array.from(this.tools.values()).map(tool => tool.toSchema())
  }

  /**
   * Execute a tool by name with given parameters
   * Uses Zod for validation
   */
  async execute(name: string, params: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name)

    if (!tool) {
      const available = Array.from(this.tools.keys()).join(', ') || 'none'
      return `Error: Tool '${name}' not found. Available tools: ${available}.${ERROR_HINT}`
    }

    try {
      // Use Zod for validation and parsing
      const result = tool.safeParseParams(params)

      if (!result.success) {
        const errors = result.error.errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join('; ')
        return `Error: ${errors}${ERROR_HINT}`
      }

      // Execute with validated params
      const output = await tool.execute(result.data)

      // Handle tool-returned errors
      if (typeof output === 'string' && output.startsWith('Error')) {
        return `${output}${ERROR_HINT}`
      }

      return output
    } catch (error) {
      return `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}${ERROR_HINT}`
    }
  }

  /**
   * List all registered tool names
   */
  list(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get the number of registered tools
   */
  size(): number {
    return this.tools.size
  }
}
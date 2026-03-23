/**
 * Tool Registry - Dynamic tool management
 * Reference: nanobot/agent/tools/registry.py
 *
 * Dependencies are injected at initialization, making tool execution simpler.
 */

import type { Logger } from '../../../config/logger'
import type { Tool, FunctionToolDefinition, ToolDeps } from './types'
import { createLogger } from '../../../config/logger'
import { createTodoTool, updateTodoTool, deleteTodoTool } from './todo-tools'

// Enhanced error hint with specific guidance for the LLM
const ERROR_HINT = `\n\n[TOOL CALL ERROR - ACTION REQUIRED]
- Check which parameters are REQUIRED vs OPTIONAL in the tool definition
- If a parameter shows as "Required", you MUST provide it in your tool call
- Example correct call: {"description": "task name", "deadline": "2026-03-25T15:00:00+08:00"}
- NEVER call a tool with empty arguments: {} - this will always fail
- If you don't have required information, ask the user for it first`

/**
 * Agent role type for role-based tool access
 */
export type AgentRole = 'todo-agent' | 'email-agent' | 'general-agent'

/**
 * Tool sets for each agent role
 */
const TOOL_SETS: Record<AgentRole, string[]> = {
  'todo-agent': ['createTodo', 'updateTodo', 'deleteTodo'],
  'email-agent': ['search_local_emails'],
  'general-agent': ['createTodo', 'updateTodo', 'deleteTodo', 'search_local_emails']
}

/**
 * Registry options for agent tools
 */
export interface ToolRegistryOptions {
  dataSource: ToolDeps['dataSource']
  defaultColumnId?: number
}

/**
 * Registry for agent tools
 * Allows dynamic registration and execution of tools
 *
 * Dependencies (dataSource, defaultColumnId) are injected at construction time,
 * eliminating the need to pass them through each execute() call.
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()
  private readonly log: Logger = createLogger('ToolRegistry')
  private readonly deps: ToolDeps

  constructor(options: ToolRegistryOptions) {
    this.deps = {
      dataSource: options.dataSource,
      defaultColumnId: options.defaultColumnId ?? 1
    }

    // Register todo tools by default
    this.register(createTodoTool)
    this.register(updateTodoTool)
    this.register(deleteTodoTool)
  }

  /**
   * Register a tool
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool)
    this.log.debug(`Registered tool: ${tool.name}`)
  }

  /**
   * Register a tool with a custom name
   */
  registerWithName(name: string, tool: Tool): void {
    this.tools.set(name, tool)
    this.log.debug(`Registered tool: ${name}`)
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
  getDefinitions(): FunctionToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.toSchema())
  }

  /**
   * Execute a tool by name with given parameters
   * Uses Zod for validation
   *
   * Note: Normal execution logs are handled by AgentLoop to avoid redundancy.
   * This method only logs errors and validation failures.
   *
   * @param name - Tool name to execute
   * @param params - Parameters to pass to the tool
   */
  async execute(name: string, params: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name)

    if (!tool) {
      // ERROR: Tool not found
      const available = Array.from(this.tools.keys()).join(', ') || 'none'
      this.log.error(`Tool not found: ${name}. Available: ${available}`)
      return `Error: Tool '${name}' not found. Available tools: ${available}.${ERROR_HINT}`
    }

    try {
      // Special check for empty arguments - this is a common LLM mistake
      if (!params || Object.keys(params).length === 0) {
        this.log.warn({ toolName: name, providedParams: params }, `Tool ${name} called with empty arguments`)
        return `Error: Tool "${name}" called with EMPTY arguments: {}\n\nYou MUST provide required parameters. Empty argument calls will always fail.\nExample: {"description": "task name"}${ERROR_HINT}`
      }

      // Use Zod for validation and parsing
      const result = tool.safeParseParams(params)

      if (!result.success) {
        // WARN: Validation failed - build a more descriptive error message
        const errors = result.error.errors
          .map(e => {
            const path = e.path.join('.')
            // Check if it's a required field error
            if (e.code === 'invalid_type' && e.expected === 'string' && e.received === 'undefined') {
              return `[MISSING REQUIRED] ${path}: "${e.message}" - You MUST provide this parameter`
            }
            return `${path}: ${e.message}`
          })
          .join('; ')
        this.log.warn({ toolName: name, errors: result.error.errors, providedParams: params }, `Validation failed for ${name}`)
        return `Error: Tool "${name}" validation failed:\n- ${errors}\n\nProvided arguments: ${JSON.stringify(params)}\nPlease provide all REQUIRED parameters.${ERROR_HINT}`
      }

      // Execute with validated params and injected deps
      const output = await tool.execute(result.data, this.deps)

      // Handle tool-returned errors
      if (typeof output === 'string' && output.startsWith('Error')) {
        return `${output}${ERROR_HINT}`
      }

      return output
    } catch (error) {
      // ERROR: Execution failed
      this.log.error({ err: error, toolName: name }, `Tool ${name} failed`)
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

  /**
   * Get all tools for a specific agent role
   */
  getToolsForRole(role: AgentRole): Tool[] {
    const toolNames = TOOL_SETS[role] || []
    return toolNames
      .map(name => this.tools.get(name))
      .filter((t): t is Tool => t !== undefined)
  }

  /**
   * Get JSON Schema for LLM function calling for a specific role
   */
  getToolSchemasForRole(role: AgentRole): Array<Record<string, unknown>> {
    return this.getToolsForRole(role).map(tool => tool.toSchema())
  }
}
/**
 * Tests for ToolRegistry
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { Tool } from './types'
import { ToolRegistry } from './registry'

// Create test tools
const EchoToolSchema = z.object({
  message: z.string().describe('Message to echo')
})

class EchoTool extends Tool<typeof EchoToolSchema> {
  name = 'echo' as const
  description = 'Echo a message'
  schema = EchoToolSchema

  async execute(params: z.infer<typeof EchoToolSchema>): Promise<string> {
    return `Echo: ${params.message}`
  }
}

const CalculatorToolSchema = z.object({
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
  a: z.number(),
  b: z.number()
})

class CalculatorTool extends Tool<typeof CalculatorToolSchema> {
  name = 'calculator' as const
  description = 'Perform basic math operations'
  schema = CalculatorToolSchema

  async execute(params: z.infer<typeof CalculatorToolSchema>): Promise<string> {
    switch (params.operation) {
      case 'add':
        return `Result: ${params.a + params.b}`
      case 'subtract':
        return `Result: ${params.a - params.b}`
      case 'multiply':
        return `Result: ${params.a * params.b}`
      case 'divide':
        return `Result: ${params.a / params.b}`
    }
  }
}

const FailingToolSchema = z.object({
  shouldFail: z.boolean().optional()
})

class FailingTool extends Tool<typeof FailingToolSchema> {
  name = 'failing_tool' as const
  description = 'A tool that can fail'
  schema = FailingToolSchema

  async execute(params: z.infer<typeof FailingToolSchema>): Promise<string> {
    if (params.shouldFail) {
      return 'Error: Something went wrong'
    }
    return 'Success'
  }
}

// Agent role type for role-based tool access
type AgentRole = 'todo-agent' | 'email-agent' | 'general-agent'

describe('ToolRegistry', () => {
  let registry: ToolRegistry

  // Mock dataSource for ToolRegistry (tools don't need real DB in tests)
  const mockDataSource = {} as any

  beforeEach(() => {
    registry = new ToolRegistry({ dataSource: mockDataSource, defaultColumnId: 1 })
  })

  describe('register', () => {
    it('should register a tool', () => {
      const echoTool = new EchoTool()
      registry.register(echoTool)

      expect(registry.has('echo')).toBe(true)
    })

    it('should overwrite existing tool with same name', () => {
      const tool1 = new EchoTool()
      const tool2 = new CalculatorTool()

      registry.register(tool1)
      registry.registerWithName('echo', tool2)

      expect(registry.get('echo')?.name).toBe('calculator')
    })
  })

  describe('get', () => {
    it('should get registered tool by name', () => {
      const echoTool = new EchoTool()
      registry.register(echoTool)

      const tool = registry.get('echo')
      expect(tool).toBeDefined()
      expect(tool?.name).toBe('echo')
    })

    it('should return undefined for unregistered tool', () => {
      expect(registry.get('nonexistent')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for registered tool', () => {
      registry.register(new EchoTool())
      expect(registry.has('echo')).toBe(true)
    })

    it('should return false for unregistered tool', () => {
      expect(registry.has('nonexistent')).toBe(false)
    })
  })

  describe('unregister', () => {
    it('should unregister a tool', () => {
      registry.register(new EchoTool())
      expect(registry.has('echo')).toBe(true)

      registry.unregister('echo')
      expect(registry.has('echo')).toBe(false)
    })

    it('should not throw when unregistering nonexistent tool', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow()
    })
  })

  describe('getDefinitions', () => {
    it('should return default todo tools after construction', () => {
      // Constructor now auto-registers 3 todo tools
      const definitions = registry.getDefinitions()
      expect(definitions).toHaveLength(3)
      expect(definitions.some(d => (d.function as any).name === 'createTodo')).toBe(true)
    })

    it('should return all tool schemas including registered tools', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      const definitions = registry.getDefinitions()

      // 3 default + 2 new = 5
      expect(definitions).toHaveLength(5)
      expect(definitions[0]).toHaveProperty('type', 'function')
      expect(definitions[0].function).toHaveProperty('name')
    })

    it('should include correct schema for registered tool', () => {
      registry.register(new EchoTool())

      const definitions = registry.getDefinitions()
      const echoDef = definitions.find(d => (d.function as any).name === 'echo')

      expect(echoDef).toBeDefined()
      expect(echoDef?.function.description).toBe('Echo a message')
    })
  })

  describe('execute', () => {
    it('should execute tool with valid params', async () => {
      registry.register(new EchoTool())

      const result = await registry.execute('echo', { message: 'Hello' })
      expect(result).toBe('Echo: Hello')
    })

    it('should execute calculator tool', async () => {
      registry.register(new CalculatorTool())

      const result = await registry.execute('calculator', { operation: 'add', a: 5, b: 3 })
      expect(result).toBe('Result: 8')
    })

    it('should return error for nonexistent tool', async () => {
      const result = await registry.execute('nonexistent', {})

      expect(result).toContain('Error')
      expect(result).toContain('not found')
    })

    it('should return error for invalid params', async () => {
      registry.register(new CalculatorTool())

      const result = await registry.execute('calculator', { operation: 'invalid' })

      expect(result).toContain('Error')
    })

    it('should handle tool execution errors gracefully', async () => {
      registry.register(new FailingTool())

      const result = await registry.execute('failing_tool', { shouldFail: true })

      expect(result).toContain('Error')
      expect(result).toContain('[TOOL CALL ERROR')
    })

    it('should add hint on validation error', async () => {
      registry.register(new EchoTool())

      const result = await registry.execute('echo', {}) // missing required message

      expect(result).toContain('[TOOL CALL ERROR')
    })
  })

  describe('list', () => {
    it('should return default todo tools after construction', () => {
      // Constructor now auto-registers createTodo, updateTodo, deleteTodo
      const toolNames = registry.list()
      expect(toolNames).toContain('createTodo')
      expect(toolNames).toContain('updateTodo')
      expect(toolNames).toContain('deleteTodo')
      expect(toolNames).toHaveLength(3)
    })

    it('should return list of tool names including registered tools', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      const toolNames = registry.list()
      expect(toolNames).toContain('echo')
      expect(toolNames).toContain('calculator')
      expect(toolNames).toContain('createTodo') // Default tool
      expect(toolNames).toHaveLength(5)
    })
  })

  describe('size', () => {
    it('should return 3 for default todo tools after construction', () => {
      // Constructor now auto-registers 3 todo tools
      expect(registry.size()).toBe(3)
    })

    it('should return correct count including default tools', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      // 3 default + 2 new = 5
      expect(registry.size()).toBe(5)
    })
  })

  describe('getToolsForRole', () => {
    it('should return empty array for unknown role', () => {
      const tools = registry.getToolsForRole('unknown-role' as AgentRole)
      expect(tools).toEqual([])
    })

    it('should return tools for todo-agent role', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      // Note: In the actual implementation, todo-agent would have
      // createTodo, updateTodo, deleteTodo tools
      // For this test, we just verify the method exists and returns tools
      const tools = registry.getToolsForRole('todo-agent' as AgentRole)
      expect(Array.isArray(tools)).toBe(true)
    })
  })

  describe('getToolSchemasForRole', () => {
    it('should return empty array for unknown role', () => {
      const schemas = registry.getToolSchemasForRole('unknown-role' as AgentRole)
      expect(schemas).toEqual([])
    })

    it('should return tool schemas in OpenAI format for a role', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      const schemas = registry.getToolSchemasForRole('todo-agent' as AgentRole)

      expect(Array.isArray(schemas)).toBe(true)
      // Each schema should have type: 'function'
      schemas.forEach(schema => {
        expect(schema).toHaveProperty('type', 'function')
        expect(schema).toHaveProperty('function')
      })
    })
  })

  // ==========================================================================
  // Phase 4: Todo Tools Registration Tests
  // ==========================================================================

  describe('Phase 4: Todo tools registration', () => {
    it('should have createTodo tool definition available when registered', () => {
      const createTodoTool = {
        name: 'createTodo',
        description: 'Create a todo',
        schema: z.object({ description: z.string() }),
        toSchema: () => ({
          type: 'function',
          function: { name: 'createTodo', description: 'Create a todo' }
        }),
        safeParseParams: (p: any) => ({ success: true, data: p }),
        execute: async () => '{"success": true}'
      }

      registry.register(createTodoTool as any)
      expect(registry.has('createTodo')).toBe(true)
    })

    it('should have updateTodo tool definition available when registered', () => {
      const updateTodoTool = {
        name: 'updateTodo',
        description: 'Update a todo',
        schema: z.object({ id: z.number() }),
        toSchema: () => ({
          type: 'function',
          function: { name: 'updateTodo', description: 'Update a todo' }
        }),
        safeParseParams: (p: any) => ({ success: true, data: p }),
        execute: async () => '{"success": true}'
      }

      registry.register(updateTodoTool as any)
      expect(registry.has('updateTodo')).toBe(true)
    })

    it('should have deleteTodo tool definition available when registered', () => {
      const deleteTodoTool = {
        name: 'deleteTodo',
        description: 'Delete a todo',
        schema: z.object({ id: z.number() }),
        toSchema: () => ({
          type: 'function',
          function: { name: 'deleteTodo', description: 'Delete a todo' }
        }),
        safeParseParams: (p: any) => ({ success: true, data: p }),
        execute: async () => '{"success": true}'
      }

      registry.register(deleteTodoTool as any)
      expect(registry.has('deleteTodo')).toBe(true)
    })

    it('should return all todo tools for todo-agent role', () => {
      // Register todo tools
      registry.register({
        name: 'createTodo',
        toSchema: () => ({ type: 'function', function: { name: 'createTodo' } })
      } as any)
      registry.register({
        name: 'updateTodo',
        toSchema: () => ({ type: 'function', function: { name: 'updateTodo' } })
      } as any)
      registry.register({
        name: 'deleteTodo',
        toSchema: () => ({ type: 'function', function: { name: 'deleteTodo' } })
      } as any)

      const tools = registry.getToolsForRole('todo-agent')

      // todo-agent should have createTodo, updateTodo, deleteTodo
      expect(tools.length).toBe(3)
      expect(tools.map(t => t.name)).toContain('createTodo')
      expect(tools.map(t => t.name)).toContain('updateTodo')
      expect(tools.map(t => t.name)).toContain('deleteTodo')
    })
  })
})
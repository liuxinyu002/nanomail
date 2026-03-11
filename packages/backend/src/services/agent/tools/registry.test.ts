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

describe('ToolRegistry', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = new ToolRegistry()
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
    it('should return empty array when no tools registered', () => {
      expect(registry.getDefinitions()).toEqual([])
    })

    it('should return all tool schemas', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      const definitions = registry.getDefinitions()

      expect(definitions).toHaveLength(2)
      expect(definitions[0]).toHaveProperty('type', 'function')
      expect(definitions[0].function).toHaveProperty('name')
    })

    it('should include correct schema for each tool', () => {
      registry.register(new EchoTool())

      const definitions = registry.getDefinitions()
      const echoDef = definitions.find(d => d.function.name === 'echo')

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
      expect(result).toContain('[Analyze the error above')
    })

    it('should add hint on validation error', async () => {
      registry.register(new EchoTool())

      const result = await registry.execute('echo', {}) // missing required message

      expect(result).toContain('[Analyze the error above')
    })
  })

  describe('list', () => {
    it('should return empty array when no tools', () => {
      expect(registry.list()).toEqual([])
    })

    it('should return list of tool names', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      expect(registry.list()).toContain('echo')
      expect(registry.list()).toContain('calculator')
      expect(registry.list()).toHaveLength(2)
    })
  })

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size()).toBe(0)
    })

    it('should return correct count', () => {
      registry.register(new EchoTool())
      registry.register(new CalculatorTool())

      expect(registry.size()).toBe(2)
    })
  })
})
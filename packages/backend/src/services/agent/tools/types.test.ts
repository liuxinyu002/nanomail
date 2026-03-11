/**
 * Tests for Tool abstract class with Zod schema validation
 * TDD: Write tests first, then implement
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { Tool } from './types'
import { zodToJsonSchema } from 'zod-to-json-schema'

describe('Tool Abstract Class with Zod', () => {
  // Define a test tool schema
  const TestToolSchema = z.object({
    query: z.string().describe('Search query'),
    limit: z.number().int().min(1).max(20).default(5).describe('Max results'),
    sender: z.string().optional().describe('Filter by sender')
  })

  // Create a concrete test tool
  class TestTool extends Tool<typeof TestToolSchema> {
    name = 'test_tool' as const
    description = 'A test tool for unit testing'
    schema = TestToolSchema

    async execute(params: z.infer<typeof TestToolSchema>): Promise<string> {
      return `Query: ${params.query}, Limit: ${params.limit}`
    }
  }

  describe('Tool schema', () => {
    it('should define name and description', () => {
      const tool = new TestTool()

      expect(tool.name).toBe('test_tool')
      expect(tool.description).toBe('A test tool for unit testing')
    })

    it('should have Zod schema', () => {
      const tool = new TestTool()

      expect(tool.schema).toBeDefined()
      expect(tool.schema).toBeInstanceOf(z.ZodObject)
    })
  })

  describe('toSchema', () => {
    it('should convert to OpenAI function schema format', () => {
      const tool = new TestTool()
      const schema = tool.toSchema()

      expect(schema).toHaveProperty('type', 'function')
      expect(schema).toHaveProperty('function')
      expect(schema.function).toHaveProperty('name', 'test_tool')
      expect(schema.function).toHaveProperty('description', 'A test tool for unit testing')
      expect(schema.function).toHaveProperty('parameters')
    })

    it('should include parameter properties in schema', () => {
      const tool = new TestTool()
      const schema = tool.toSchema()
      const params = schema.function.parameters as Record<string, unknown>

      expect(params).toHaveProperty('type', 'object')
      expect(params).toHaveProperty('properties')
      expect(params.properties).toHaveProperty('query')
      expect(params.properties).toHaveProperty('limit')
      expect(params.properties).toHaveProperty('sender')
    })

    it('should mark required fields', () => {
      const tool = new TestTool()
      const schema = tool.toSchema()
      const params = schema.function.parameters as Record<string, unknown>

      expect(params.required).toContain('query')
      // limit has default, so not required
      // sender is optional
    })
  })

  describe('parseParams', () => {
    it('should parse valid parameters', () => {
      const tool = new TestTool()
      const params = tool.parseParams({ query: 'test', limit: 10 })

      expect(params.query).toBe('test')
      expect(params.limit).toBe(10)
    })

    it('should apply default values', () => {
      const tool = new TestTool()
      const params = tool.parseParams({ query: 'test' })

      expect(params.limit).toBe(5) // default value
    })

    it('should throw on invalid parameters', () => {
      const tool = new TestTool()

      expect(() => tool.parseParams({})).toThrow()
      expect(() => tool.parseParams({ query: 123 })).toThrow()
    })

    it('should throw on limit out of range', () => {
      const tool = new TestTool()

      expect(() => tool.parseParams({ query: 'test', limit: 100 })).toThrow()
      expect(() => tool.parseParams({ query: 'test', limit: 0 })).toThrow()
    })
  })

  describe('safeParseParams', () => {
    it('should return success for valid params', () => {
      const tool = new TestTool()
      const result = tool.safeParseParams({ query: 'test' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.query).toBe('test')
        expect(result.data.limit).toBe(5)
      }
    })

    it('should return error for invalid params', () => {
      const tool = new TestTool()
      const result = tool.safeParseParams({ limit: 'invalid' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
        expect(result.error.errors).toBeDefined()
      }
    })

    it('should provide detailed error messages', () => {
      const tool = new TestTool()
      const result = tool.safeParseParams({ limit: 100 })

      expect(result.success).toBe(false)
      if (!result.success) {
        const errorMessages = result.error.errors.map(e => e.message)
        expect(errorMessages.length).toBeGreaterThan(0)
      }
    })
  })

  describe('execute', () => {
    it('should execute with validated parameters', async () => {
      const tool = new TestTool()
      const result = await tool.execute({ query: 'search', limit: 10 })

      expect(result).toBe('Query: search, Limit: 10')
    })
  })
})

describe('Complex Zod Schemas', () => {
  it('should handle nested objects', () => {
    const NestedSchema = z.object({
      filter: z.object({
        sender: z.string(),
        dateRange: z.object({
          from: z.string(),
          to: z.string()
        }).optional()
      })
    })

    class NestedTool extends Tool<typeof NestedSchema> {
      name = 'nested_tool'
      description = 'Tool with nested schema'
      schema = NestedSchema

      async execute(): Promise<string> {
        return 'ok'
      }
    }

    const tool = new NestedTool()
    const schema = tool.toSchema()
    const params = schema.function.parameters as Record<string, unknown>

    expect(params.properties).toHaveProperty('filter')
  })

  it('should handle arrays', () => {
    const ArraySchema = z.object({
      ids: z.array(z.string()).describe('List of IDs'),
      tags: z.array(z.enum(['important', 'work', 'personal'])).optional()
    })

    class ArrayTool extends Tool<typeof ArraySchema> {
      name = 'array_tool'
      description = 'Tool with array schema'
      schema = ArraySchema

      async execute(): Promise<string> {
        return 'ok'
      }
    }

    const tool = new ArrayTool()
    const params = tool.parseParams({ ids: ['1', '2', '3'] })

    expect(params.ids).toEqual(['1', '2', '3'])
  })

  it('should handle enums', () => {
    const EnumSchema = z.object({
      priority: z.enum(['low', 'medium', 'high']),
      status: z.enum(['unread', 'read', 'archived']).optional()
    })

    class EnumTool extends Tool<typeof EnumSchema> {
      name = 'enum_tool'
      description = 'Tool with enum schema'
      schema = EnumSchema

      async execute(): Promise<string> {
        return 'ok'
      }
    }

    const tool = new EnumTool()
    const params = tool.parseParams({ priority: 'high' })

    expect(params.priority).toBe('high')

    // Should reject invalid enum value
    expect(() => tool.parseParams({ priority: 'invalid' })).toThrow()
  })

  it('should handle unions', () => {
    const UnionSchema = z.object({
      target: z.union([z.string(), z.number()]).describe('String or number target')
    })

    class UnionTool extends Tool<typeof UnionSchema> {
      name = 'union_tool'
      description = 'Tool with union schema'
      schema = UnionSchema

      async execute(): Promise<string> {
        return 'ok'
      }
    }

    const tool = new UnionTool()

    expect(tool.parseParams({ target: 'string' }).target).toBe('string')
    expect(tool.parseParams({ target: 42 }).target).toBe(42)
  })
})
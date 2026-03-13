import { describe, it, expect } from 'vitest'
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema
} from './todo'

describe('Todo Schemas', () => {
  describe('TodoSchema', () => {
    const validTodo = {
      id: 1,
      emailId: 100,
      description: 'Test todo item',
      urgency: 'high' as const,
      status: 'pending' as const,
      deadline: '2024-03-15T23:59:59.000Z',
      createdAt: '2024-01-15T10:00:00Z'
    }

    it('should parse valid todo with deadline', () => {
      const result = TodoSchema.parse(validTodo)
      expect(result.deadline).toBe('2024-03-15T23:59:59.000Z')
    })

    it('should accept null deadline', () => {
      const result = TodoSchema.parse({ ...validTodo, deadline: null })
      expect(result.deadline).toBeNull()
    })

    it('should coerce createdAt to Date object', () => {
      const result = TodoSchema.parse(validTodo)
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should accept all valid urgency values', () => {
      expect(TodoSchema.parse({ ...validTodo, urgency: 'high' }).urgency).toBe('high')
      expect(TodoSchema.parse({ ...validTodo, urgency: 'medium' }).urgency).toBe('medium')
      expect(TodoSchema.parse({ ...validTodo, urgency: 'low' }).urgency).toBe('low')
    })

    it('should accept all valid status values', () => {
      expect(TodoSchema.parse({ ...validTodo, status: 'pending' }).status).toBe('pending')
      expect(TodoSchema.parse({ ...validTodo, status: 'in_progress' }).status).toBe('in_progress')
      expect(TodoSchema.parse({ ...validTodo, status: 'completed' }).status).toBe('completed')
    })

    it('should reject invalid urgency', () => {
      expect(() => TodoSchema.parse({ ...validTodo, urgency: 'critical' })).toThrow()
    })

    it('should reject invalid status', () => {
      expect(() => TodoSchema.parse({ ...validTodo, status: 'done' })).toThrow()
    })
  })

  describe('CreateTodoSchema', () => {
    const validCreate = {
      emailId: 100,
      description: 'Test todo item',
      urgency: 'high' as const,
      status: 'pending' as const,
      deadline: '2024-03-15T23:59:59.000Z'
    }

    it('should parse valid create todo with deadline', () => {
      const result = CreateTodoSchema.parse(validCreate)
      expect(result.deadline).toBe('2024-03-15T23:59:59.000Z')
    })

    it('should accept null deadline', () => {
      const result = CreateTodoSchema.parse({ ...validCreate, deadline: null })
      expect(result.deadline).toBeNull()
    })

    it('should omit id field', () => {
      const result = CreateTodoSchema.parse(validCreate)
      expect((result as Record<string, unknown>).id).toBeUndefined()
    })

    it('should omit createdAt field', () => {
      const result = CreateTodoSchema.parse(validCreate)
      expect((result as Record<string, unknown>).createdAt).toBeUndefined()
    })
  })

  describe('UpdateTodoSchema', () => {
    it('should allow partial updates', () => {
      const result = UpdateTodoSchema.parse({ status: 'completed' })
      expect(result.status).toBe('completed')
    })

    it('should allow updating deadline', () => {
      const result = UpdateTodoSchema.parse({ deadline: '2024-04-01T23:59:59.000Z' })
      expect(result.deadline).toBe('2024-04-01T23:59:59.000Z')
    })

    it('should allow setting deadline to null', () => {
      const result = UpdateTodoSchema.parse({ deadline: null })
      expect(result.deadline).toBeNull()
    })

    it('should allow empty object', () => {
      const result = UpdateTodoSchema.parse({})
      expect(result).toEqual({})
    })
  })
})
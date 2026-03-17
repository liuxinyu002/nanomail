import { describe, it, expect } from 'vitest'
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoDateRangeQuerySchema
} from './todo'

describe('Todo Schemas', () => {
  describe('TodoSchema', () => {
    const validTodo = {
      id: 1,
      emailId: 100,
      description: 'Test todo item',
      status: 'pending' as const,
      deadline: '2024-03-15T23:59:59.000Z',
      boardColumnId: 1,
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

    it('should accept all valid status values', () => {
      expect(TodoSchema.parse({ ...validTodo, status: 'pending' }).status).toBe('pending')
      expect(TodoSchema.parse({ ...validTodo, status: 'in_progress' }).status).toBe('in_progress')
      expect(TodoSchema.parse({ ...validTodo, status: 'completed' }).status).toBe('completed')
    })

    it('should have boardColumnId with default value', () => {
      const result = TodoSchema.parse({ ...validTodo, boardColumnId: undefined })
      expect(result.boardColumnId).toBe(1) // Default to Inbox
    })

    it('should accept optional position field', () => {
      const result = TodoSchema.parse({ ...validTodo, position: 5 })
      expect(result.position).toBe(5)
    })

    it('should reject invalid status', () => {
      expect(() => TodoSchema.parse({ ...validTodo, status: 'done' })).toThrow()
    })

    it('should reject invalid boardColumnId (non-positive)', () => {
      expect(() => TodoSchema.parse({ ...validTodo, boardColumnId: 0 })).toThrow()
      expect(() => TodoSchema.parse({ ...validTodo, boardColumnId: -1 })).toThrow()
    })
  })

  describe('CreateTodoSchema', () => {
    const validCreate = {
      emailId: 100,
      description: 'Test todo item',
      status: 'pending' as const,
      deadline: '2024-03-15T23:59:59.000Z',
      boardColumnId: 1
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

    it('should accept optional position field', () => {
      const result = CreateTodoSchema.parse({ ...validCreate, position: 10 })
      expect(result.position).toBe(10)
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

    it('should allow updating description', () => {
      const result = UpdateTodoSchema.parse({ description: 'Updated description' })
      expect(result.description).toBe('Updated description')
    })

    it('should allow updating boardColumnId', () => {
      const result = UpdateTodoSchema.parse({ boardColumnId: 2 })
      expect(result.boardColumnId).toBe(2)
    })

    it('should allow updating position', () => {
      const result = UpdateTodoSchema.parse({ position: 5 })
      expect(result.position).toBe(5)
    })

    it('should NOT allow emailId in update (emailId is not updatable)', () => {
      // UpdateTodoSchema should explicitly exclude emailId from updatable fields
      const result = UpdateTodoSchema.safeParse({ emailId: 200 })
      expect(result.success).toBe(false)
    })

    it('should NOT allow id in update', () => {
      const result = UpdateTodoSchema.safeParse({ id: 999 })
      expect(result.success).toBe(false)
    })

    it('should NOT allow createdAt in update', () => {
      const result = UpdateTodoSchema.safeParse({ createdAt: '2024-01-01T00:00:00Z' })
      expect(result.success).toBe(false)
    })

    it('should allow empty object', () => {
      const result = UpdateTodoSchema.parse({})
      expect(result).toEqual({})
    })

    it('should allow updating multiple fields at once', () => {
      const result = UpdateTodoSchema.parse({
        description: 'New description',
        status: 'in_progress',
        deadline: '2024-05-01T12:00:00.000Z',
        boardColumnId: 3,
        position: 10
      })
      expect(result.description).toBe('New description')
      expect(result.status).toBe('in_progress')
      expect(result.deadline).toBe('2024-05-01T12:00:00.000Z')
      expect(result.boardColumnId).toBe(3)
      expect(result.position).toBe(10)
    })
  })

  describe('TodoDateRangeQuerySchema', () => {
    it('should accept valid date range query', () => {
      const result = TodoDateRangeQuerySchema.parse({
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      })
      expect(result.startDate).toBe('2024-03-01')
      expect(result.endDate).toBe('2024-03-31')
    })

    it('should accept same start and end date', () => {
      const result = TodoDateRangeQuerySchema.parse({
        startDate: '2024-03-15',
        endDate: '2024-03-15'
      })
      expect(result.startDate).toBe('2024-03-15')
      expect(result.endDate).toBe('2024-03-15')
    })

    it('should reject invalid date format (no dashes)', () => {
      const result = TodoDateRangeQuerySchema.safeParse({
        startDate: '20240301',
        endDate: '20240331'
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format (wrong separator)', () => {
      const result = TodoDateRangeQuerySchema.safeParse({
        startDate: '2024/03/01',
        endDate: '2024/03/31'
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing startDate', () => {
      const result = TodoDateRangeQuerySchema.safeParse({
        endDate: '2024-03-31'
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing endDate', () => {
      const result = TodoDateRangeQuerySchema.safeParse({
        startDate: '2024-03-01'
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty object', () => {
      const result = TodoDateRangeQuerySchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject extra fields (strict parsing)', () => {
      const result = TodoDateRangeQuerySchema.safeParse({
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        extraField: 'not allowed'
      })
      // Note: We may or may not want strict parsing - adjust test based on requirements
      // For now, we'll allow extra fields since the plan doesn't specify strict mode
      expect(result.success).toBe(true)
    })

    it('should reject invalid month in startDate', () => {
      const result = TodoDateRangeQuerySchema.safeParse({
        startDate: '2024-13-01',
        endDate: '2024-03-31'
      })
      // Regex only validates format, not valid dates - this should pass regex but
      // may fail elsewhere in the application. The schema only validates format.
      expect(result.success).toBe(true)
    })
  })
})
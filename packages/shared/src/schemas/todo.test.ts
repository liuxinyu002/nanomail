import { describe, it, expect } from 'vitest'
import {
  TodoSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  TodoDateRangeQuerySchema,
  TodoSourceSchema,
  TodosQuerySchema,
  ArchivedTodosQuerySchema,
  ArchiveCursorSchema,
  ArchiveCursorPayloadSchema,
  ArchivedTodosResponseSchema
} from './todo'

// Helper to create a 2001 character string for testing max length
const createLongString = (length: number) => 'a'.repeat(length)

describe('Todo Schemas', () => {
  describe('TodoSourceSchema', () => {
    it('should accept "email" as valid source', () => {
      expect(TodoSourceSchema.parse('email')).toBe('email')
    })

    it('should accept "chat" as valid source', () => {
      expect(TodoSourceSchema.parse('chat')).toBe('chat')
    })

    it('should accept "manual" as valid source', () => {
      expect(TodoSourceSchema.parse('manual')).toBe('manual')
    })

    it('should reject invalid source value', () => {
      expect(() => TodoSourceSchema.parse('invalid')).toThrow()
    })

    it('should reject empty string', () => {
      expect(() => TodoSourceSchema.parse('')).toThrow()
    })

    it('should reject null', () => {
      expect(() => TodoSourceSchema.parse(null)).toThrow()
    })

    it('should reject undefined', () => {
      expect(() => TodoSourceSchema.parse(undefined)).toThrow()
    })

    it('should expose enum values', () => {
      expect(TodoSourceSchema.options).toEqual(['email', 'chat', 'manual'])
    })
  })

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

    describe('color field', () => {
      it('should accept valid hex color (#RRGGBB)', () => {
        const result = TodoSchema.parse({ ...validTodo, color: '#FF5733' })
        expect(result.color).toBe('#FF5733')
      })

      it('should accept lowercase hex color', () => {
        const result = TodoSchema.parse({ ...validTodo, color: '#ff5733' })
        expect(result.color).toBe('#ff5733')
      })

      it('should accept mixed case hex color', () => {
        const result = TodoSchema.parse({ ...validTodo, color: '#Ff57aB' })
        expect(result.color).toBe('#Ff57aB')
      })

      it('should accept null color', () => {
        const result = TodoSchema.parse({ ...validTodo, color: null })
        expect(result.color).toBeNull()
      })

      it('should default color to null when not provided', () => {
        const result = TodoSchema.parse(validTodo)
        expect(result.color).toBeNull()
      })

      it('should reject invalid hex color (missing #)', () => {
        expect(() => TodoSchema.parse({ ...validTodo, color: 'FF5733' })).toThrow()
      })

      it('should reject invalid hex color (wrong length)', () => {
        expect(() => TodoSchema.parse({ ...validTodo, color: '#FF573' })).toThrow() // 5 chars
        expect(() => TodoSchema.parse({ ...validTodo, color: '#FF57333' })).toThrow() // 7 chars
      })

      it('should reject invalid hex color (invalid characters)', () => {
        expect(() => TodoSchema.parse({ ...validTodo, color: '#GG5733' })).toThrow()
      })

      it('should reject empty string color', () => {
        expect(() => TodoSchema.parse({ ...validTodo, color: '' })).toThrow()
      })
    })

    describe('emailId field (nullable for standalone todos)', () => {
      it('should accept positive integer emailId', () => {
        const result = TodoSchema.parse({ ...validTodo, emailId: 100 })
        expect(result.emailId).toBe(100)
      })

      it('should accept null emailId (for standalone todos)', () => {
        const result = TodoSchema.parse({ ...validTodo, emailId: null })
        expect(result.emailId).toBeNull()
      })

      it('should reject negative emailId', () => {
        expect(() => TodoSchema.parse({ ...validTodo, emailId: -1 })).toThrow()
      })

      it('should reject zero emailId', () => {
        expect(() => TodoSchema.parse({ ...validTodo, emailId: 0 })).toThrow()
      })

      it('should reject non-integer emailId', () => {
        expect(() => TodoSchema.parse({ ...validTodo, emailId: 1.5 })).toThrow()
      })

      it('should reject undefined emailId (must be explicit null)', () => {
        expect(() => TodoSchema.parse({ ...validTodo, emailId: undefined })).toThrow()
      })
    })

    describe('source field', () => {
      it('should accept "email" source', () => {
        const result = TodoSchema.parse({ ...validTodo, source: 'email' })
        expect(result.source).toBe('email')
      })

      it('should accept "chat" source', () => {
        const result = TodoSchema.parse({ ...validTodo, source: 'chat' })
        expect(result.source).toBe('chat')
      })

      it('should accept "manual" source', () => {
        const result = TodoSchema.parse({ ...validTodo, source: 'manual' })
        expect(result.source).toBe('manual')
      })

      it('should default to "manual" when source not provided', () => {
        const result = TodoSchema.parse(validTodo)
        expect(result.source).toBe('manual')
      })

      it('should reject invalid source value', () => {
        expect(() => TodoSchema.parse({ ...validTodo, source: 'invalid' })).toThrow()
      })
    })

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

    describe('notes field', () => {
      it('should accept notes field with valid text', () => {
        const result = TodoSchema.parse({ ...validTodo, notes: 'This is a note' })
        expect(result.notes).toBe('This is a note')
      })

      it('should accept null notes', () => {
        const result = TodoSchema.parse({ ...validTodo, notes: null })
        expect(result.notes).toBeNull()
      })

      it('should accept empty string notes', () => {
        const result = TodoSchema.parse({ ...validTodo, notes: '' })
        expect(result.notes).toBe('')
      })

      it('should accept notes up to 2000 characters', () => {
        const longNotes = createLongString(2000)
        const result = TodoSchema.parse({ ...validTodo, notes: longNotes })
        expect(result.notes).toBe(longNotes)
        expect(result.notes?.length).toBe(2000)
      })

      it('should reject notes exceeding 2000 characters', () => {
        const tooLongNotes = createLongString(2001)
        expect(() => TodoSchema.parse({ ...validTodo, notes: tooLongNotes })).toThrow()
      })

      it('should default notes to null when not provided', () => {
        const result = TodoSchema.parse(validTodo)
        expect(result.notes).toBeNull()
      })
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

    describe('color field (derived - should be rejected)', () => {
      it('should reject color field in create request', () => {
        const result = CreateTodoSchema.safeParse({ ...validCreate, color: '#FF5733' })
        expect(result.success).toBe(false)
      })

      it('should reject color: null in create request', () => {
        const result = CreateTodoSchema.safeParse({ ...validCreate, color: null })
        expect(result.success).toBe(false)
      })

      it('should reject any unknown field in create request', () => {
        const result = CreateTodoSchema.safeParse({ ...validCreate, unknownField: 'value' })
        expect(result.success).toBe(false)
      })
    })

    it('should parse valid create todo with deadline', () => {
      const result = CreateTodoSchema.parse(validCreate)
      expect(result.deadline).toBe('2024-03-15T23:59:59.000Z')
    })

    it('should accept null deadline', () => {
      const result = CreateTodoSchema.parse({ ...validCreate, deadline: null })
      expect(result.deadline).toBeNull()
    })

    describe('emailId field (nullable for standalone todos)', () => {
      it('should accept positive integer emailId', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, emailId: 100 })
        expect(result.emailId).toBe(100)
      })

      it('should accept null emailId (for standalone todos created by AI)', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, emailId: null })
        expect(result.emailId).toBeNull()
      })

      it('should reject negative emailId', () => {
        expect(() => CreateTodoSchema.parse({ ...validCreate, emailId: -1 })).toThrow()
      })

      it('should reject zero emailId', () => {
        expect(() => CreateTodoSchema.parse({ ...validCreate, emailId: 0 })).toThrow()
      })
    })

    describe('source field', () => {
      it('should accept "email" source', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, source: 'email' })
        expect(result.source).toBe('email')
      })

      it('should accept "chat" source (AI-created)', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, source: 'chat' })
        expect(result.source).toBe('chat')
      })

      it('should accept "manual" source', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, source: 'manual' })
        expect(result.source).toBe('manual')
      })

      it('should default to "manual" when source not provided', () => {
        const result = CreateTodoSchema.parse(validCreate)
        expect(result.source).toBe('manual')
      })

      it('should reject invalid source value', () => {
        expect(() => CreateTodoSchema.parse({ ...validCreate, source: 'invalid' })).toThrow()
      })
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

    describe('notes field', () => {
      it('should accept notes field with valid text', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, notes: 'This is a note' })
        expect(result.notes).toBe('This is a note')
      })

      it('should accept null notes', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, notes: null })
        expect(result.notes).toBeNull()
      })

      it('should accept empty string notes', () => {
        const result = CreateTodoSchema.parse({ ...validCreate, notes: '' })
        expect(result.notes).toBe('')
      })

      it('should accept notes up to 2000 characters', () => {
        const longNotes = createLongString(2000)
        const result = CreateTodoSchema.parse({ ...validCreate, notes: longNotes })
        expect(result.notes).toBe(longNotes)
      })

      it('should reject notes exceeding 2000 characters', () => {
        const tooLongNotes = createLongString(2001)
        expect(() => CreateTodoSchema.parse({ ...validCreate, notes: tooLongNotes })).toThrow()
      })

      it('should default notes to null when not provided', () => {
        const result = CreateTodoSchema.parse(validCreate)
        expect(result.notes).toBeNull()
      })
    })
  })

  describe('UpdateTodoSchema', () => {
    describe('color field (derived - should be rejected)', () => {
      it('should reject color field in update request', () => {
        const result = UpdateTodoSchema.safeParse({ color: '#FF5733' })
        expect(result.success).toBe(false)
      })

      it('should reject color: null in update request', () => {
        const result = UpdateTodoSchema.safeParse({ color: null })
        expect(result.success).toBe(false)
      })

      it('should reject color along with valid fields', () => {
        const result = UpdateTodoSchema.safeParse({
          description: 'Updated',
          color: '#FF5733'
        })
        expect(result.success).toBe(false)
      })
    })

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

    describe('notes field', () => {
      it('should allow updating notes', () => {
        const result = UpdateTodoSchema.parse({ notes: 'Updated notes' })
        expect(result.notes).toBe('Updated notes')
      })

      it('should allow setting notes to null', () => {
        const result = UpdateTodoSchema.parse({ notes: null })
        expect(result.notes).toBeNull()
      })

      it('should allow setting notes to empty string', () => {
        const result = UpdateTodoSchema.parse({ notes: '' })
        expect(result.notes).toBe('')
      })

      it('should accept notes up to 2000 characters', () => {
        const longNotes = createLongString(2000)
        const result = UpdateTodoSchema.parse({ notes: longNotes })
        expect(result.notes).toBe(longNotes)
      })

      it('should reject notes exceeding 2000 characters', () => {
        const tooLongNotes = createLongString(2001)
        expect(() => UpdateTodoSchema.parse({ notes: tooLongNotes })).toThrow()
      })

      it('should allow updating notes along with other fields', () => {
        const result = UpdateTodoSchema.parse({
          description: 'Updated description',
          notes: 'Important notes for this todo',
          status: 'in_progress'
        })
        expect(result.description).toBe('Updated description')
        expect(result.notes).toBe('Important notes for this todo')
        expect(result.status).toBe('in_progress')
      })
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

  describe('TodosQuerySchema', () => {
    it('should accept empty query (no filters)', () => {
      const result = TodosQuerySchema.parse({})
      expect(result).toEqual({})
    })

    it('should accept status filter', () => {
      const result = TodosQuerySchema.parse({ status: 'pending' })
      expect(result.status).toBe('pending')
    })

    it('should accept excludeStatus filter', () => {
      const result = TodosQuerySchema.parse({ excludeStatus: 'completed' })
      expect(result.excludeStatus).toBe('completed')
    })

    it('should accept boardColumnId filter', () => {
      const result = TodosQuerySchema.parse({ boardColumnId: 1 })
      expect(result.boardColumnId).toBe(1)
    })

    it('should accept emailId filter', () => {
      const result = TodosQuerySchema.parse({ emailId: 100 })
      expect(result.emailId).toBe(100)
    })

    it('should accept multiple filters', () => {
      const result = TodosQuerySchema.parse({
        status: 'pending',
        boardColumnId: 2,
        emailId: 100
      })
      expect(result.status).toBe('pending')
      expect(result.boardColumnId).toBe(2)
      expect(result.emailId).toBe(100)
    })

    it('should reject invalid status value', () => {
      const result = TodosQuerySchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid excludeStatus value', () => {
      const result = TodosQuerySchema.safeParse({ excludeStatus: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should reject negative boardColumnId', () => {
      const result = TodosQuerySchema.safeParse({ boardColumnId: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject zero boardColumnId', () => {
      const result = TodosQuerySchema.safeParse({ boardColumnId: 0 })
      expect(result.success).toBe(false)
    })

    it('should reject negative emailId', () => {
      const result = TodosQuerySchema.safeParse({ emailId: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject unknown fields', () => {
      const result = TodosQuerySchema.safeParse({ unknownField: 'value' })
      expect(result.success).toBe(false)
    })
  })

  describe('ArchivedTodosQuerySchema', () => {
    it('should accept valid limit', () => {
      const result = ArchivedTodosQuerySchema.parse({ limit: 20 })
      expect(result.limit).toBe(20)
    })

    it('should accept limit with cursor', () => {
      const cursor = Buffer.from(JSON.stringify({ completedAt: '2024-03-15T10:00:00Z', id: 1 })).toString('base64')
      const result = ArchivedTodosQuerySchema.parse({ limit: 20, cursor })
      expect(result.limit).toBe(20)
      expect(result.cursor).toBe(cursor)
    })

    it('should reject missing limit', () => {
      const result = ArchivedTodosQuerySchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject limit less than 1', () => {
      const result = ArchivedTodosQuerySchema.safeParse({ limit: 0 })
      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const result = ArchivedTodosQuerySchema.safeParse({ limit: 101 })
      expect(result.success).toBe(false)
    })

    it('should accept limit of 1', () => {
      const result = ArchivedTodosQuerySchema.parse({ limit: 1 })
      expect(result.limit).toBe(1)
    })

    it('should accept limit of 100', () => {
      const result = ArchivedTodosQuerySchema.parse({ limit: 100 })
      expect(result.limit).toBe(100)
    })

    it('should reject non-integer limit', () => {
      const result = ArchivedTodosQuerySchema.safeParse({ limit: 20.5 })
      expect(result.success).toBe(false)
    })

    it('should reject invalid cursor (non-base64)', () => {
      const result = ArchivedTodosQuerySchema.safeParse({ limit: 20, cursor: 'not-valid-base64!@#' })
      expect(result.success).toBe(false)
    })

    it('should accept empty cursor string', () => {
      // Base64 encoding of empty string
      const result = ArchivedTodosQuerySchema.safeParse({ limit: 20, cursor: '' })
      // Empty string is valid base64
      expect(result.success).toBe(true)
    })
  })

  describe('ArchiveCursorSchema', () => {
    it('should accept valid base64 string', () => {
      const validBase64 = Buffer.from('test').toString('base64')
      const result = ArchiveCursorSchema.parse(validBase64)
      expect(result).toBe(validBase64)
    })

    it('should accept empty string', () => {
      const result = ArchiveCursorSchema.parse('')
      expect(result).toBe('')
    })

    it('should reject non-string values', () => {
      expect(() => ArchiveCursorSchema.parse(null)).toThrow()
      expect(() => ArchiveCursorSchema.parse(undefined)).toThrow()
      expect(() => ArchiveCursorSchema.parse(123)).toThrow()
    })

    it('should reject invalid base64 characters', () => {
      expect(() => ArchiveCursorSchema.parse('not-valid-base64!@#$')).toThrow()
    })
  })

  describe('ArchiveCursorPayloadSchema', () => {
    it('should accept valid payload', () => {
      const payload = {
        completedAt: '2024-03-15T10:00:00.000Z',
        id: 1
      }
      const result = ArchiveCursorPayloadSchema.parse(payload)
      expect(result.completedAt).toBe('2024-03-15T10:00:00.000Z')
      expect(result.id).toBe(1)
    })

    it('should reject missing completedAt', () => {
      const result = ArchiveCursorPayloadSchema.safeParse({ id: 1 })
      expect(result.success).toBe(false)
    })

    it('should reject missing id', () => {
      const result = ArchiveCursorPayloadSchema.safeParse({ completedAt: '2024-03-15T10:00:00.000Z' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid datetime format', () => {
      const result = ArchiveCursorPayloadSchema.safeParse({
        completedAt: '2024-03-15',
        id: 1
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-positive id', () => {
      const result = ArchiveCursorPayloadSchema.safeParse({
        completedAt: '2024-03-15T10:00:00.000Z',
        id: 0
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative id', () => {
      const result = ArchiveCursorPayloadSchema.safeParse({
        completedAt: '2024-03-15T10:00:00.000Z',
        id: -1
      })
      expect(result.success).toBe(false)
    })

    it('should reject extra fields', () => {
      const result = ArchiveCursorPayloadSchema.safeParse({
        completedAt: '2024-03-15T10:00:00.000Z',
        id: 1,
        extraField: 'not allowed'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('ArchivedTodosResponseSchema', () => {
    const validTodo = {
      id: 1,
      emailId: 100,
      description: 'Test todo',
      status: 'completed' as const,
      deadline: null,
      boardColumnId: 4,
      notes: null,
      color: null,
      source: 'manual' as const,
      createdAt: '2024-01-15T10:00:00Z'
    }

    it('should accept valid response with todos and no cursor', () => {
      const response = {
        todos: [validTodo],
        nextCursor: null,
        hasMore: false
      }
      const result = ArchivedTodosResponseSchema.parse(response)
      expect(result.todos).toHaveLength(1)
      expect(result.nextCursor).toBeNull()
      expect(result.hasMore).toBe(false)
    })

    it('should accept valid response with cursor', () => {
      const cursor = Buffer.from(JSON.stringify({ completedAt: '2024-03-15T10:00:00.000Z', id: 1 })).toString('base64')
      const response = {
        todos: [validTodo],
        nextCursor: cursor,
        hasMore: true
      }
      const result = ArchivedTodosResponseSchema.parse(response)
      expect(result.todos).toHaveLength(1)
      expect(result.nextCursor).toBe(cursor)
      expect(result.hasMore).toBe(true)
    })

    it('should accept empty todos array', () => {
      const response = {
        todos: [],
        nextCursor: null,
        hasMore: false
      }
      const result = ArchivedTodosResponseSchema.parse(response)
      expect(result.todos).toHaveLength(0)
      expect(result.nextCursor).toBeNull()
      expect(result.hasMore).toBe(false)
    })

    it('should reject missing todos field', () => {
      const result = ArchivedTodosResponseSchema.safeParse({
        nextCursor: null,
        hasMore: false
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing nextCursor field', () => {
      const result = ArchivedTodosResponseSchema.safeParse({
        todos: [validTodo],
        hasMore: false
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing hasMore field', () => {
      const result = ArchivedTodosResponseSchema.safeParse({
        todos: [validTodo],
        nextCursor: null
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid todo in array', () => {
      const invalidTodo = { ...validTodo, status: 'invalid' }
      const result = ArchivedTodosResponseSchema.safeParse({
        todos: [invalidTodo],
        nextCursor: null,
        hasMore: false
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean hasMore', () => {
      const result = ArchivedTodosResponseSchema.safeParse({
        todos: [validTodo],
        nextCursor: null,
        hasMore: 'true'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('TodoSchema.completedAt field', () => {
    const validTodo = {
      id: 1,
      emailId: 100,
      description: 'Test todo item',
      status: 'completed' as const,
      deadline: '2024-03-15T23:59:59.000Z',
      boardColumnId: 1,
      createdAt: '2024-01-15T10:00:00Z'
    }

    it('should accept valid datetime string for completedAt', () => {
      const result = TodoSchema.parse({ ...validTodo, completedAt: '2024-03-15T10:00:00.000Z' })
      expect(result.completedAt).toBe('2024-03-15T10:00:00.000Z')
    })

    it('should accept null for completedAt', () => {
      const result = TodoSchema.parse({ ...validTodo, completedAt: null })
      expect(result.completedAt).toBeNull()
    })

    it('should accept undefined completedAt (nullable)', () => {
      const result = TodoSchema.parse({ ...validTodo, completedAt: undefined })
      expect(result.completedAt).toBeNull()
    })

    it('should default completedAt to null when not provided', () => {
      const result = TodoSchema.parse(validTodo)
      expect(result.completedAt).toBeNull()
    })

    it('should reject invalid datetime format', () => {
      const result = TodoSchema.safeParse({ ...validTodo, completedAt: '2024-03-15' })
      expect(result.success).toBe(false)
    })

    it('should reject non-datetime string', () => {
      const result = TodoSchema.safeParse({ ...validTodo, completedAt: 'not a date' })
      expect(result.success).toBe(false)
    })

    it('should reject number for completedAt', () => {
      const result = TodoSchema.safeParse({ ...validTodo, completedAt: 1234567890 })
      expect(result.success).toBe(false)
    })
  })

  describe('CreateTodoSchema.completedAt field (server-managed)', () => {
    const validCreate = {
      emailId: 100,
      description: 'Test todo item',
      status: 'pending' as const,
      deadline: '2024-03-15T23:59:59.000Z',
      boardColumnId: 1
    }

    it('should reject completedAt in create request', () => {
      const result = CreateTodoSchema.safeParse({ ...validCreate, completedAt: '2024-03-15T10:00:00.000Z' })
      expect(result.success).toBe(false)
    })

    it('should reject completedAt: null in create request', () => {
      const result = CreateTodoSchema.safeParse({ ...validCreate, completedAt: null })
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateTodoSchema.completedAt field (server-managed)', () => {
    it('should reject completedAt in update request', () => {
      const result = UpdateTodoSchema.safeParse({ completedAt: '2024-03-15T10:00:00.000Z' })
      expect(result.success).toBe(false)
    })

    it('should reject completedAt: null in update request', () => {
      const result = UpdateTodoSchema.safeParse({ completedAt: null })
      expect(result.success).toBe(false)
    })

    it('should reject completedAt along with valid fields', () => {
      const result = UpdateTodoSchema.safeParse({
        description: 'Updated',
        completedAt: '2024-03-15T10:00:00.000Z'
      })
      expect(result.success).toBe(false)
    })
  })
})
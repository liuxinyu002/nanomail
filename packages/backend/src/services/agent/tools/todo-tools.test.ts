/**
 * Tests for Todo Tools
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { createTodoTool, CreateTodoSchema } from './todo-tools'
import { updateTodoTool, UpdateTodoSchema } from './todo-tools'
import { deleteTodoTool, DeleteTodoSchema } from './todo-tools'
import { parseDateTime, formatTodoForResponse } from './todo-tools'
import type { Todo } from '../../../entities/Todo.entity'
import type { DataSource, Repository } from 'typeorm'

// ============================================
// Test Helpers
// ============================================

interface MockTodoRepository {
  create: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  findOne: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

interface MockBoardColumnRepository {
  findOne: ReturnType<typeof vi.fn>
}

const createMockDataSource = (
  todoRepo: MockTodoRepository,
  boardColumnRepo?: MockBoardColumnRepository
): DataSource => {
  return {
    getRepository: vi.fn((entity: unknown) => {
      // Return different repos based on entity
      const entityName = typeof entity === 'function' ? entity.name : String(entity)
      if (entityName === 'BoardColumn') {
        return boardColumnRepo || { findOne: vi.fn().mockResolvedValue(null) }
      }
      return todoRepo
    })
  } as unknown as DataSource
}

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => {
  return {
    id: 1,
    emailId: null,
    email: null,
    description: 'Test todo',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    boardColumn: null as unknown as Todo['boardColumn'],
    position: 0,
    notes: null,
    source: 'chat',
    createdAt: new Date(),
    ...overrides
  } as Todo
}

// ============================================
// parseDateTime Tests
// ============================================

describe('parseDateTime', () => {
  it('should parse valid ISO 8601 datetime with timezone', () => {
    const result = parseDateTime('2024-01-15T15:00:00+08:00')

    expect(result.isValid).toBe(true)
    expect(result.toDate()).toBeInstanceOf(Date)
  })

  it('should parse valid ISO 8601 datetime with Z suffix', () => {
    const result = parseDateTime('2024-01-15T07:00:00Z')

    expect(result.isValid).toBe(true)
    expect(result.toDate()).toBeInstanceOf(Date)
  })

  it('should parse valid date string (YYYY-MM-DD)', () => {
    const result = parseDateTime('2024-01-15')

    expect(result.isValid).toBe(true)
    expect(result.toDate()).toBeInstanceOf(Date)
  })

  it('should reject empty string', () => {
    const result = parseDateTime('')

    expect(result.isValid).toBe(false)
    expect(result.toDate()).toBeNull()
  })

  it('should reject null/undefined', () => {
    const result1 = parseDateTime(null as unknown as string)
    const result2 = parseDateTime(undefined as unknown as string)

    expect(result1.isValid).toBe(false)
    expect(result2.isValid).toBe(false)
  })

  it('should reject natural language like "tomorrow"', () => {
    const result = parseDateTime('tomorrow')

    expect(result.isValid).toBe(false)
  })

  it('should reject natural language like "next week"', () => {
    const result = parseDateTime('next week')

    expect(result.isValid).toBe(false)
  })

  it('should reject natural language like "in 2 days"', () => {
    const result = parseDateTime('in 2 days')

    expect(result.isValid).toBe(false)
  })

  it('should reject invalid date format', () => {
    const result = parseDateTime('not-a-date')

    expect(result.isValid).toBe(false)
  })

  it('should reject malformed ISO string', () => {
    const result = parseDateTime('2024-13-45T99:99:99Z')

    expect(result.isValid).toBe(false)
  })
})

// ============================================
// formatTodoForResponse Tests
// ============================================

describe('formatTodoForResponse', () => {
  it('should format todo with all fields', () => {
    const fixedDate = new Date('2024-01-01T00:00:00.000Z')
    const todo = createMockTodo({
      id: 42,
      description: 'Complete project',
      deadline: new Date('2024-03-20T10:00:00Z'),
      status: 'in_progress',
      boardColumnId: 2,
      notes: 'Important notes',
      source: 'chat',
      createdAt: fixedDate
    })

    const result = formatTodoForResponse(todo, '#f59e0b')

    expect(result).toEqual({
      id: 42,
      emailId: null,
      description: 'Complete project',
      deadline: '2024-03-20T10:00:00.000Z',
      status: 'in_progress',
      boardColumnId: 2,
      notes: 'Important notes',
      color: '#f59e0b',
      source: 'chat',
      createdAt: '2024-01-01T00:00:00.000Z'
    })
  })

  it('should handle null deadline', () => {
    const todo = createMockTodo({
      deadline: null
    })

    const result = formatTodoForResponse(todo, null)

    expect(result.deadline).toBeNull()
  })

  it('should handle null notes', () => {
    const todo = createMockTodo({
      notes: null
    })

    const result = formatTodoForResponse(todo, null)

    expect(result.notes).toBeNull()
  })
})

// ============================================
// CreateTodoSchema Tests
// ============================================

describe('CreateTodoSchema', () => {
  it('should parse valid params with description only', () => {
    const params = CreateTodoSchema.parse({ description: 'Test todo' })

    expect(params.description).toBe('Test todo')
    expect(params.deadline).toBeUndefined()
    expect(params.notes).toBeUndefined()
    expect(params.forceCreate).toBeUndefined()
  })

  it('should parse valid params with all fields', () => {
    const params = CreateTodoSchema.parse({
      description: 'Test todo',
      deadline: '2024-03-20T10:00:00Z',
      notes: 'Some notes',
      forceCreate: true
    })

    expect(params.description).toBe('Test todo')
    expect(params.deadline).toBe('2024-03-20T10:00:00Z')
    expect(params.notes).toBe('Some notes')
    expect(params.forceCreate).toBe(true)
  })

  it('should reject empty description', () => {
    expect(() => CreateTodoSchema.parse({ description: '' })).toThrow()
  })

  it('should reject whitespace-only description', () => {
    expect(() => CreateTodoSchema.parse({ description: '   ' })).toThrow()
  })

  it('should reject missing description', () => {
    expect(() => CreateTodoSchema.parse({})).toThrow()
  })
})

// ============================================
// createTodoTool Tests
// ============================================

describe('createTodoTool', () => {
  let mockRepo: MockTodoRepository
  let mockBoardColumnRepo: MockBoardColumnRepository
  let mockDataSource: DataSource

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      remove: vi.fn()
    }
    mockBoardColumnRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 1, color: '#C9CDD4' })
    }
    mockDataSource = createMockDataSource(mockRepo, mockBoardColumnRepo)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('schema', () => {
    it('should have correct name', () => {
      expect(createTodoTool.name).toBe('createTodo')
    })

    it('should have description', () => {
      expect(createTodoTool.description).toContain('Create a new todo')
    })

    it('should have valid Zod schema', () => {
      expect(createTodoTool.schema).toBeInstanceOf(z.ZodObject)
    })
  })

  describe('toSchema', () => {
    it('should generate OpenAI function schema', () => {
      const schema = createTodoTool.toSchema()

      expect(schema.type).toBe('function')
      expect(schema.function.name).toBe('createTodo')
      expect(schema.function.parameters).toHaveProperty('properties')
      expect(schema.function.parameters.additionalProperties).toBe(false)
    })
  })

  describe('execute', () => {
    it('should return EMPTY_DESCRIPTION for empty description', async () => {
      const result = await createTodoTool.execute(
        { description: '' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('EMPTY_DESCRIPTION')
    })

    it('should return EMPTY_DESCRIPTION for whitespace-only description', async () => {
      const result = await createTodoTool.execute(
        { description: '   ' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('EMPTY_DESCRIPTION')
    })

    it('should return DESCRIPTION_TOO_LONG for description > 2000 chars', async () => {
      const longDescription = 'a'.repeat(2001)

      const result = await createTodoTool.execute(
        { description: longDescription },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('DESCRIPTION_TOO_LONG')
    })

    it('should create todo successfully', async () => {
      const mockTodo = createMockTodo({ id: 42 })
      mockRepo.findOne.mockResolvedValue(null) // No duplicate
      mockRepo.create.mockReturnValue(mockTodo)
      mockRepo.save.mockResolvedValue(mockTodo)

      const result = await createTodoTool.execute(
        { description: 'Test todo' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('success')
      expect(result).toContain('42')
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test todo',
          source: 'chat',
          status: 'pending'
        })
      )
    })

    it('should detect duplicate within 5 minutes', async () => {
      const recentTodo = createMockTodo({
        id: 99,
        description: 'Test todo',
        createdAt: new Date(Date.now() - 1000) // 1 second ago
      })
      mockRepo.findOne.mockResolvedValue(recentTodo)

      const result = await createTodoTool.execute(
        { description: 'Test todo' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('DUPLICATE_DETECTED')
      expect(result).toContain('99')
    })

    it('should detect duplicate with existing incomplete todo', async () => {
      const existingTodo = createMockTodo({
        id: 88,
        description: 'Test todo',
        status: 'pending',
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      })
      mockRepo.findOne.mockResolvedValue(existingTodo)

      const result = await createTodoTool.execute(
        { description: 'Test todo' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('DUPLICATE_DETECTED')
    })

    it('should not detect duplicate for completed todos', async () => {
      const completedTodo = createMockTodo({
        id: 77,
        description: 'Test todo',
        status: 'completed',
        createdAt: new Date(Date.now() - 10 * 60 * 1000)
      })
      // First call for 5-min check returns null, second call for incomplete check returns null
      mockRepo.findOne.mockResolvedValueOnce(null)

      const newTodo = createMockTodo({ id: 100 })
      mockRepo.create.mockReturnValue(newTodo)
      mockRepo.save.mockResolvedValue(newTodo)

      const result = await createTodoTool.execute(
        { description: 'Test todo' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('success')
    })

    it('should bypass duplicate check with forceCreate=true', async () => {
      // mockRepo.findOne should NOT be called for duplicate check when forceCreate is true
      // but mockBoardColumnRepo.findOne will be called to get color
      const newTodo = createMockTodo({ id: 100 })
      mockRepo.create.mockReturnValue(newTodo)
      mockRepo.save.mockResolvedValue(newTodo)

      const result = await createTodoTool.execute(
        { description: 'Test todo', forceCreate: true },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('success')
      // todoRepo.findOne should NOT be called for duplicate check
      expect(mockRepo.findOne).not.toHaveBeenCalled()
      // boardColumnRepo.findOne SHOULD be called to get color
      expect(mockBoardColumnRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('should support notes field', async () => {
      const mockTodo = createMockTodo({ id: 42, notes: 'Important notes' })
      mockRepo.findOne.mockResolvedValue(null)
      mockRepo.create.mockReturnValue(mockTodo)
      mockRepo.save.mockResolvedValue(mockTodo)

      await createTodoTool.execute(
        { description: 'Test todo', notes: 'Important notes' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Important notes'
        })
      )
    })

    it('should store empty notes as null', async () => {
      const mockTodo = createMockTodo({ id: 42, notes: null })
      mockRepo.findOne.mockResolvedValue(null)
      mockRepo.create.mockReturnValue(mockTodo)
      mockRepo.save.mockResolvedValue(mockTodo)

      await createTodoTool.execute(
        { description: 'Test todo', notes: '   ' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: null
        })
      )
    })

    it('should return NOTES_TOO_LONG for notes > 2000 chars', async () => {
      const longNotes = 'a'.repeat(2001)

      const result = await createTodoTool.execute(
        { description: 'Test todo', notes: longNotes },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('NOTES_TOO_LONG')
    })

    it('should set source to chat by default', async () => {
      const mockTodo = createMockTodo({ id: 42 })
      mockRepo.findOne.mockResolvedValue(null)
      mockRepo.create.mockReturnValue(mockTodo)
      mockRepo.save.mockResolvedValue(mockTodo)

      await createTodoTool.execute(
        { description: 'Test todo' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'chat'
        })
      )
    })

    it('should return INVALID_DEADLINE_FORMAT for invalid deadline', async () => {
      const result = await createTodoTool.execute(
        { description: 'Test todo', deadline: 'tomorrow' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('INVALID_DEADLINE_FORMAT')
    })

    it('should handle valid deadline', async () => {
      const mockTodo = createMockTodo({
        id: 42,
        deadline: new Date('2024-03-20T10:00:00Z')
      })
      mockRepo.findOne.mockResolvedValue(null)
      mockRepo.create.mockReturnValue(mockTodo)
      mockRepo.save.mockResolvedValue(mockTodo)

      const result = await createTodoTool.execute(
        { description: 'Test todo', deadline: '2024-03-20T10:00:00Z' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('success')
    })

    it('should handle database errors gracefully', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      mockRepo.create.mockReturnValue(createMockTodo())
      mockRepo.save.mockRejectedValue(new Error('Database error'))

      const result = await createTodoTool.execute(
        { description: 'Test todo' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('DATABASE_ERROR')
    })
  })
})

// ============================================
// UpdateTodoSchema Tests
// ============================================

describe('UpdateTodoSchema', () => {
  it('should parse valid params with id only', () => {
    const params = UpdateTodoSchema.parse({ id: 1 })

    expect(params.id).toBe(1)
    expect(params.description).toBeUndefined()
    expect(params.deadline).toBeUndefined()
    expect(params.status).toBeUndefined()
    expect(params.notes).toBeUndefined()
  })

  it('should parse valid params with all fields', () => {
    const params = UpdateTodoSchema.parse({
      id: 1,
      description: 'Updated description',
      deadline: '2024-03-20T10:00:00Z',
      status: 'in_progress',
      notes: 'Updated notes'
    })

    expect(params.id).toBe(1)
    expect(params.description).toBe('Updated description')
    expect(params.deadline).toBe('2024-03-20T10:00:00Z')
    expect(params.status).toBe('in_progress')
    expect(params.notes).toBe('Updated notes')
  })

  it('should accept null deadline to remove deadline', () => {
    const params = UpdateTodoSchema.parse({
      id: 1,
      deadline: null
    })

    expect(params.deadline).toBeNull()
  })

  it('should reject missing id', () => {
    expect(() => UpdateTodoSchema.parse({})).toThrow()
  })

  it('should reject invalid status', () => {
    expect(() =>
      UpdateTodoSchema.parse({ id: 1, status: 'invalid_status' })
    ).toThrow()
  })
})

// ============================================
// updateTodoTool Tests
// ============================================

describe('updateTodoTool', () => {
  let mockRepo: MockTodoRepository
  let mockBoardColumnRepo: MockBoardColumnRepository
  let mockDataSource: DataSource

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      remove: vi.fn()
    }
    mockBoardColumnRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 1, color: '#C9CDD4' })
    }
    mockDataSource = createMockDataSource(mockRepo, mockBoardColumnRepo)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('schema', () => {
    it('should have correct name', () => {
      expect(updateTodoTool.name).toBe('updateTodo')
    })

    it('should have description', () => {
      expect(updateTodoTool.description).toContain('Update an existing todo')
    })

    it('should have valid Zod schema', () => {
      expect(updateTodoTool.schema).toBeInstanceOf(z.ZodObject)
    })
  })

  describe('toSchema', () => {
    it('should generate OpenAI function schema', () => {
      const schema = updateTodoTool.toSchema()

      expect(schema.type).toBe('function')
      expect(schema.function.name).toBe('updateTodo')
      expect(schema.function.parameters).toHaveProperty('properties')
      expect(schema.function.parameters.additionalProperties).toBe(false)
    })
  })

  describe('execute', () => {
    it('should return TODO_NOT_FOUND for non-existent id', async () => {
      mockRepo.findOne.mockResolvedValue(null)

      const result = await updateTodoTool.execute(
        { id: 999 },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('TODO_NOT_FOUND')
    })

    it('should update todo successfully', async () => {
      const existingTodo = createMockTodo({ id: 1, description: 'Old description' })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.save.mockResolvedValue({
        ...existingTodo,
        description: 'New description'
      })

      const result = await updateTodoTool.execute(
        { id: 1, description: 'New description' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('success')
      expect(mockRepo.save).toHaveBeenCalled()
    })

    it('should perform partial update (only specified fields)', async () => {
      const existingTodo = createMockTodo({
        id: 1,
        description: 'Old description',
        status: 'pending',
        notes: 'Old notes'
      })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.save.mockResolvedValue(existingTodo)

      await updateTodoTool.execute(
        { id: 1, status: 'completed' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      // Only status should change
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Old description',
          status: 'completed',
          notes: 'Old notes'
        })
      )
    })

    it('should return INVALID_DEADLINE_FORMAT for invalid deadline', async () => {
      const existingTodo = createMockTodo({ id: 1 })
      mockRepo.findOne.mockResolvedValue(existingTodo)

      const result = await updateTodoTool.execute(
        { id: 1, deadline: 'next week' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('INVALID_DEADLINE_FORMAT')
    })

    it('should remove deadline when deadline is null', async () => {
      const existingTodo = createMockTodo({
        id: 1,
        deadline: new Date('2024-03-20T10:00:00Z')
      })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.save.mockResolvedValue({ ...existingTodo, deadline: null })

      await updateTodoTool.execute(
        { id: 1, deadline: null },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deadline: null
        })
      )
    })

    it('should update notes', async () => {
      const existingTodo = createMockTodo({ id: 1, notes: null })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.save.mockResolvedValue({
        ...existingTodo,
        notes: 'New notes'
      })

      await updateTodoTool.execute(
        { id: 1, notes: 'New notes' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'New notes'
        })
      )
    })

    it('should store empty notes as null', async () => {
      const existingTodo = createMockTodo({ id: 1, notes: 'Old notes' })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.save.mockResolvedValue({ ...existingTodo, notes: null })

      await updateTodoTool.execute(
        { id: 1, notes: '   ' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: null
        })
      )
    })

    it('should return NOTES_TOO_LONG for notes > 2000 chars', async () => {
      const existingTodo = createMockTodo({ id: 1 })
      mockRepo.findOne.mockResolvedValue(existingTodo)

      const longNotes = 'a'.repeat(2001)

      const result = await updateTodoTool.execute(
        { id: 1, notes: longNotes },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('NOTES_TOO_LONG')
    })

    it('should return EMPTY_DESCRIPTION for empty description', async () => {
      const existingTodo = createMockTodo({ id: 1 })
      mockRepo.findOne.mockResolvedValue(existingTodo)

      const result = await updateTodoTool.execute(
        { id: 1, description: '' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('EMPTY_DESCRIPTION')
    })

    it('should return DESCRIPTION_TOO_LONG for description > 2000 chars', async () => {
      const existingTodo = createMockTodo({ id: 1 })
      mockRepo.findOne.mockResolvedValue(existingTodo)

      const longDescription = 'a'.repeat(2001)

      const result = await updateTodoTool.execute(
        { id: 1, description: longDescription },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('DESCRIPTION_TOO_LONG')
    })

    it('should handle database errors gracefully', async () => {
      const existingTodo = createMockTodo({ id: 1 })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.save.mockRejectedValue(new Error('Database error'))

      const result = await updateTodoTool.execute(
        { id: 1, description: 'New description' },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('DATABASE_ERROR')
    })
  })
})

// ============================================
// DeleteTodoSchema Tests
// ============================================

describe('DeleteTodoSchema', () => {
  it('should parse valid params with id', () => {
    const params = DeleteTodoSchema.parse({ id: 1 })

    expect(params.id).toBe(1)
  })

  it('should reject missing id', () => {
    expect(() => DeleteTodoSchema.parse({})).toThrow()
  })

  it('should reject non-integer id', () => {
    expect(() => DeleteTodoSchema.parse({ id: 1.5 })).toThrow()
  })
})

// ============================================
// deleteTodoTool Tests
// ============================================

describe('deleteTodoTool', () => {
  let mockRepo: MockTodoRepository
  let mockBoardColumnRepo: MockBoardColumnRepository
  let mockDataSource: DataSource

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      remove: vi.fn()
    }
    mockBoardColumnRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 1, color: '#C9CDD4' })
    }
    mockDataSource = createMockDataSource(mockRepo, mockBoardColumnRepo)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('schema', () => {
    it('should have correct name', () => {
      expect(deleteTodoTool.name).toBe('deleteTodo')
    })

    it('should have description', () => {
      expect(deleteTodoTool.description).toContain('Delete a todo')
    })

    it('should have valid Zod schema', () => {
      expect(deleteTodoTool.schema).toBeInstanceOf(z.ZodObject)
    })
  })

  describe('toSchema', () => {
    it('should generate OpenAI function schema', () => {
      const schema = deleteTodoTool.toSchema()

      expect(schema.type).toBe('function')
      expect(schema.function.name).toBe('deleteTodo')
      expect(schema.function.parameters).toHaveProperty('properties')
      expect(schema.function.parameters.additionalProperties).toBe(false)
    })
  })

  describe('execute', () => {
    it('should return TODO_NOT_FOUND for non-existent id', async () => {
      mockRepo.findOne.mockResolvedValue(null)

      const result = await deleteTodoTool.execute(
        { id: 999 },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('TODO_NOT_FOUND')
    })

    it('should delete todo successfully', async () => {
      const existingTodo = createMockTodo({ id: 1, description: 'Todo to delete' })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.remove.mockResolvedValue(existingTodo)

      const result = await deleteTodoTool.execute(
        { id: 1 },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('success')
      expect(mockRepo.remove).toHaveBeenCalledWith(existingTodo)
    })

    it('should return deleted todo info in response', async () => {
      const existingTodo = createMockTodo({
        id: 1,
        description: 'Todo to delete'
      })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.remove.mockResolvedValue(existingTodo)

      const result = await deleteTodoTool.execute(
        { id: 1 },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('1')
      expect(result).toContain('Todo to delete')
    })

    it('should handle database errors gracefully', async () => {
      const existingTodo = createMockTodo({ id: 1 })
      mockRepo.findOne.mockResolvedValue(existingTodo)
      mockRepo.remove.mockRejectedValue(new Error('Database error'))

      const result = await deleteTodoTool.execute(
        { id: 1 },
        { dataSource: mockDataSource, defaultColumnId: 1 }
      )

      expect(result).toContain('DATABASE_ERROR')
    })
  })
})

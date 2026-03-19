import { describe, it, expect } from 'vitest'
import { BoardColumnSchema, CreateBoardColumnSchema, UpdateBoardColumnSchema, UpdateTodoPositionSchema, BatchUpdateTodoPositionSchema } from '@nanomail/shared'

describe('BoardColumn Schemas', () => {
  describe('BoardColumnSchema', () => {
    const validColumn = {
      id: 1,
      name: '收件箱',
      color: '#C9CDD4',
      order: 0,
      isSystem: true,
      createdAt: '2024-01-15T10:00:00Z'
    }

    it('should parse valid column with all fields', () => {
      const result = BoardColumnSchema.parse(validColumn)
      expect(result.name).toBe('收件箱')
      expect(result.isSystem).toBe(true)
    })

    it('should accept null color', () => {
      const result = BoardColumnSchema.parse({ ...validColumn, color: null })
      expect(result.color).toBeNull()
    })

    it('should coerce createdAt to Date object', () => {
      const result = BoardColumnSchema.parse(validColumn)
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should reject empty name', () => {
      expect(() => BoardColumnSchema.parse({ ...validColumn, name: '' })).toThrow()
    })

    it('should reject name longer than 50 characters', () => {
      expect(() => BoardColumnSchema.parse({ ...validColumn, name: 'a'.repeat(51) })).toThrow()
    })

    it('should accept name up to 50 characters', () => {
      const result = BoardColumnSchema.parse({ ...validColumn, name: 'a'.repeat(50) })
      expect(result.name).toHaveLength(50)
    })

    it('should reject negative order', () => {
      expect(() => BoardColumnSchema.parse({ ...validColumn, order: -1 })).toThrow()
    })

    it('should reject invalid hex color format', () => {
      expect(() => BoardColumnSchema.parse({ ...validColumn, color: 'red' })).toThrow()
      expect(() => BoardColumnSchema.parse({ ...validColumn, color: '#fff' })).toThrow()
      expect(() => BoardColumnSchema.parse({ ...validColumn, color: '#gggggg' })).toThrow()
    })

    it('should accept valid hex color format', () => {
      const result = BoardColumnSchema.parse({ ...validColumn, color: '#ABC123' })
      expect(result.color).toBe('#ABC123')
    })
  })

  describe('CreateBoardColumnSchema', () => {
    const validCreate = {
      name: '待处理',
      color: '#f59e0b',
      order: 1
    }

    it('should parse valid create data', () => {
      const result = CreateBoardColumnSchema.parse(validCreate)
      expect(result.name).toBe('待处理')
      expect(result.color).toBe('#f59e0b')
    })

    it('should allow optional color', () => {
      const result = CreateBoardColumnSchema.parse({ name: 'Test', order: 0 })
      expect(result.color).toBeUndefined()
    })

    it('should omit id field', () => {
      const result = CreateBoardColumnSchema.parse(validCreate)
      expect((result as Record<string, unknown>).id).toBeUndefined()
    })

    it('should omit createdAt field', () => {
      const result = CreateBoardColumnSchema.parse(validCreate)
      expect((result as Record<string, unknown>).createdAt).toBeUndefined()
    })

    it('should omit isSystem field', () => {
      const result = CreateBoardColumnSchema.parse(validCreate)
      expect((result as Record<string, unknown>).isSystem).toBeUndefined()
    })

    it('should reject empty name', () => {
      expect(() => CreateBoardColumnSchema.parse({ name: '', order: 0 })).toThrow()
    })

    it('should reject invalid hex color format', () => {
      expect(() => CreateBoardColumnSchema.parse({ name: 'Test', color: 'invalid', order: 0 })).toThrow()
    })
  })

  describe('UpdateBoardColumnSchema', () => {
    it('should allow partial updates', () => {
      const result = UpdateBoardColumnSchema.parse({ name: '新名称' })
      expect(result.name).toBe('新名称')
    })

    it('should allow updating color', () => {
      const result = UpdateBoardColumnSchema.parse({ color: '#3b82f6' })
      expect(result.color).toBe('#3b82f6')
    })

    it('should allow updating order', () => {
      const result = UpdateBoardColumnSchema.parse({ order: 5 })
      expect(result.order).toBe(5)
    })

    it('should allow updating name and color together', () => {
      const result = UpdateBoardColumnSchema.parse({ name: 'Updated', color: '#000000' })
      expect(result.name).toBe('Updated')
      expect(result.color).toBe('#000000')
    })

    it('should allow empty object', () => {
      const result = UpdateBoardColumnSchema.parse({})
      expect(result).toEqual({})
    })

    it('should reject invalid name length', () => {
      expect(() => UpdateBoardColumnSchema.parse({ name: '' })).toThrow()
      expect(() => UpdateBoardColumnSchema.parse({ name: 'a'.repeat(51) })).toThrow()
    })
  })

  describe('UpdateTodoPositionSchema', () => {
    it('should parse valid position update', () => {
      const result = UpdateTodoPositionSchema.parse({ boardColumnId: 1, position: 0 })
      expect(result.boardColumnId).toBe(1)
      expect(result.position).toBe(0)
    })

    it('should allow optional position', () => {
      const result = UpdateTodoPositionSchema.parse({ boardColumnId: 2 })
      expect(result.position).toBeUndefined()
    })

    it('should allow deadline as ISO string', () => {
      const result = UpdateTodoPositionSchema.parse({
        boardColumnId: 1,
        deadline: '2024-12-31T23:59:59Z'
      })
      expect(result.deadline).toBe('2024-12-31T23:59:59Z')
    })

    it('should allow null deadline', () => {
      const result = UpdateTodoPositionSchema.parse({ boardColumnId: 1, deadline: null })
      expect(result.deadline).toBeNull()
    })

    it('should reject negative position', () => {
      expect(() => UpdateTodoPositionSchema.parse({ boardColumnId: 1, position: -1 })).toThrow()
    })

    it('should reject non-positive boardColumnId', () => {
      expect(() => UpdateTodoPositionSchema.parse({ boardColumnId: 0 })).toThrow()
      expect(() => UpdateTodoPositionSchema.parse({ boardColumnId: -1 })).toThrow()
    })
  })

  describe('BatchUpdateTodoPositionSchema', () => {
    it('should parse valid batch update', () => {
      const result = BatchUpdateTodoPositionSchema.parse({
        updates: [
          { id: 1, boardColumnId: 2, position: 0 },
          { id: 2, boardColumnId: 3, position: 1 }
        ]
      })
      expect(result.updates).toHaveLength(2)
    })

    it('should allow empty updates array', () => {
      const result = BatchUpdateTodoPositionSchema.parse({ updates: [] })
      expect(result.updates).toHaveLength(0)
    })

    it('should reject negative position', () => {
      expect(() => BatchUpdateTodoPositionSchema.parse({
        updates: [{ id: 1, boardColumnId: 1, position: -1 }]
      })).toThrow()
    })

    it('should reject non-positive id', () => {
      expect(() => BatchUpdateTodoPositionSchema.parse({
        updates: [{ id: 0, boardColumnId: 1, position: 0 }]
      })).toThrow()
    })

    it('should reject non-positive boardColumnId', () => {
      expect(() => BatchUpdateTodoPositionSchema.parse({
        updates: [{ id: 1, boardColumnId: 0, position: 0 }]
      })).toThrow()
    })
  })
})

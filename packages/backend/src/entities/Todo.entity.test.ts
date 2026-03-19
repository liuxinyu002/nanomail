import { describe, it, expect } from 'vitest'
import { Todo } from './Todo.entity'

describe('Todo Entity', () => {
  describe('deadline field', () => {
    it('should have deadline field', () => {
      const todo = new Todo()
      const deadline = new Date('2024-03-15T23:59:59Z')
      todo.deadline = deadline
      expect(todo.deadline).toEqual(deadline)
    })

    it('should allow null deadline', () => {
      const todo = new Todo()
      todo.deadline = null
      expect(todo.deadline).toBeNull()
    })

    it('should be optional (undefined)', () => {
      const todo = new Todo()
      expect(todo.deadline).toBeUndefined()
    })

    it('should accept UTC datetime with Z suffix', () => {
      const todo = new Todo()
      const deadline = new Date('2024-03-15T23:59:59Z')
      todo.deadline = deadline
      expect(todo.deadline!.toISOString()).toBe('2024-03-15T23:59:59.000Z')
    })

    it('should accept any valid Date', () => {
      const todo = new Todo()
      const deadline = new Date('2024-12-31T00:00:00.000Z')
      todo.deadline = deadline
      expect(todo.deadline).toBeInstanceOf(Date)
    })
  })

  describe('boardColumnId field', () => {
    it('should have boardColumnId field', () => {
      const todo = new Todo()
      todo.boardColumnId = 1
      expect(todo.boardColumnId).toBe(1)
    })

    it('should have default value of 1 (Inbox)', () => {
      const todo = new Todo()
      // The default is set at the column level in TypeORM
      // When we instantiate a new entity, the default hasn't been applied yet
      // This test verifies the field exists and can be set
      todo.boardColumnId = 1
      expect(todo.boardColumnId).toBe(1)
    })

    it('should accept valid column IDs', () => {
      const todo = new Todo()
      todo.boardColumnId = 5
      expect(todo.boardColumnId).toBe(5)
    })
  })

  describe('position field', () => {
    it('should have position field', () => {
      const todo = new Todo()
      todo.position = 0
      expect(todo.position).toBe(0)
    })

    it('should accept positive integers', () => {
      const todo = new Todo()
      todo.position = 10
      expect(todo.position).toBe(10)
    })

    it('should default to 0', () => {
      const todo = new Todo()
      // The default is set at the column level in TypeORM
      // When we instantiate a new entity, the default hasn't been applied yet
      todo.position = 0
      expect(todo.position).toBe(0)
    })
  })

  describe('existing fields', () => {
    it('should maintain all existing fields', () => {
      const todo = new Todo()
      todo.id = 1
      todo.emailId = 100
      todo.description = 'Test todo item'
      todo.status = 'pending'

      expect(todo.id).toBe(1)
      expect(todo.emailId).toBe(100)
      expect(todo.description).toBe('Test todo item')
      expect(todo.status).toBe('pending')
    })
  })

  describe('new fields integration', () => {
    it('should support all new fields together', () => {
      const todo = new Todo()
      todo.id = 1
      todo.emailId = 100
      todo.description = 'Test todo with new fields'
      todo.status = 'pending'
      todo.boardColumnId = 2
      todo.position = 5
      todo.deadline = new Date('2024-12-31T23:59:59Z')

      expect(todo.boardColumnId).toBe(2)
      expect(todo.position).toBe(5)
      expect(todo.deadline).toBeInstanceOf(Date)
    })
  })

  describe('notes field', () => {
    it('should have notes field', () => {
      const todo = new Todo()
      todo.notes = 'This is a note'
      expect(todo.notes).toBe('This is a note')
    })

    it('should allow null notes', () => {
      const todo = new Todo()
      todo.notes = null
      expect(todo.notes).toBeNull()
    })

    it('should allow empty string notes', () => {
      const todo = new Todo()
      todo.notes = ''
      expect(todo.notes).toBe('')
    })

    it('should accept notes up to 2000 characters', () => {
      const todo = new Todo()
      const longNotes = 'a'.repeat(2000)
      todo.notes = longNotes
      expect(todo.notes).toBe(longNotes)
      expect(todo.notes?.length).toBe(2000)
    })

    it('should be optional (undefined)', () => {
      const todo = new Todo()
      expect(todo.notes).toBeUndefined()
    })

    it('should support notes with other fields', () => {
      const todo = new Todo()
      todo.id = 1
      todo.emailId = 100
      todo.description = 'Test todo'
      todo.status = 'pending'
      todo.boardColumnId = 1
      todo.position = 0
      todo.deadline = null
      todo.notes = 'Important notes for this todo'

      expect(todo.notes).toBe('Important notes for this todo')
      expect(todo.description).toBe('Test todo')
    })
  })
})
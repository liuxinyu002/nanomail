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

  describe('existing fields', () => {
    it('should maintain all existing fields', () => {
      const todo = new Todo()
      todo.id = 1
      todo.emailId = 100
      todo.description = 'Test todo item'
      todo.urgency = 'high'
      todo.status = 'pending'

      expect(todo.id).toBe(1)
      expect(todo.emailId).toBe(100)
      expect(todo.description).toBe('Test todo item')
      expect(todo.urgency).toBe('high')
      expect(todo.status).toBe('pending')
    })
  })
})
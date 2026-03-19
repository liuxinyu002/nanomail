import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createTodoRoutes } from './todo.routes'
import type { DataSource, Repository } from 'typeorm'
import { Todo } from '../entities/Todo.entity'

// Mock query builder for date range tests
interface MockQueryBuilder {
  where: ReturnType<typeof vi.fn>
  orWhere: ReturnType<typeof vi.fn>
  andWhere: ReturnType<typeof vi.fn>
  orderBy: ReturnType<typeof vi.fn>
  addOrderBy: ReturnType<typeof vi.fn>
  getMany: ReturnType<typeof vi.fn>
  leftJoinAndSelect: ReturnType<typeof vi.fn>
}

describe('TodoRoutes', () => {
  let app: express.Application
  let mockDataSource: DataSource
  let mockRepository: Repository<Todo>
  let mockQueryBuilder: MockQueryBuilder

  beforeEach(() => {
    // Create mock query builder
    mockQueryBuilder = {
      where: vi.fn().mockReturnThis(),
      orWhere: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn(),
      leftJoinAndSelect: vi.fn().mockReturnThis(),
    }

    // Create mock repository
    mockRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
    } as unknown as Repository<Todo>

    // Create mock data source
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
      isInitialized: true,
      transaction: vi.fn().mockImplementation(async (cb) => {
        const transactionManager = {
          getRepository: vi.fn().mockReturnValue(mockRepository),
        }
        return cb(transactionManager)
      }),
    } as unknown as DataSource

    // Create express app with routes
    app = express()
    app.use(express.json())
    app.use('/api/todos', createTodoRoutes(mockDataSource))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/todos', () => {
    it('should return list of todos', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'Test todo',
          status: 'pending' as const,
          deadline: new Date('2024-12-31T23:59:59Z'),
          boardColumnId: 1,
          position: 0,
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockTodos)

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos).toHaveLength(1)
    })

    describe('color field (derived from BoardColumn)', () => {
      it('should return color from related boardColumn', async () => {
        const mockTodos = [
          {
            id: 1,
            emailId: 1,
            description: 'Test todo',
            status: 'pending' as const,
            deadline: new Date('2024-12-31T23:59:59Z'),
            boardColumnId: 2,
            boardColumn: { id: 2, name: 'Todo', color: '#FF5733' },
            position: 0,
            createdAt: new Date('2024-01-15'),
          },
        ]

        vi.mocked(mockRepository.find).mockResolvedValue(mockTodos as unknown as Todo[])

        const response = await request(app).get('/api/todos')

        expect(response.status).toBe(200)
        expect(response.body.todos[0].color).toBe('#FF5733')
      })

      it('should return null color when boardColumn has no color', async () => {
        const mockTodos = [
          {
            id: 1,
            emailId: 1,
            description: 'Test todo',
            status: 'pending' as const,
            deadline: new Date('2024-12-31T23:59:59Z'),
            boardColumnId: 1,
            boardColumn: { id: 1, name: 'Inbox', color: null },
            position: 0,
            createdAt: new Date('2024-01-15'),
          },
        ]

        vi.mocked(mockRepository.find).mockResolvedValue(mockTodos as unknown as Todo[])

        const response = await request(app).get('/api/todos')

        expect(response.status).toBe(200)
        expect(response.body.todos[0].color).toBeNull()
      })

      it('should return null color when boardColumn relation is not loaded', async () => {
        const mockTodos = [
          {
            id: 1,
            emailId: 1,
            description: 'Test todo',
            status: 'pending' as const,
            deadline: new Date('2024-12-31T23:59:59Z'),
            boardColumnId: 1,
            // boardColumn relation not loaded
            position: 0,
            createdAt: new Date('2024-01-15'),
          },
        ]

        vi.mocked(mockRepository.find).mockResolvedValue(mockTodos)

        const response = await request(app).get('/api/todos')

        expect(response.status).toBe(200)
        expect(response.body.todos[0].color).toBeNull()
      })

      it('should request boardColumn relation in find options', async () => {
        vi.mocked(mockRepository.find).mockResolvedValue([])

        await request(app).get('/api/todos')

        expect(mockRepository.find).toHaveBeenCalledWith(
          expect.objectContaining({
            relations: expect.arrayContaining(['boardColumn']),
          })
        )
      })
    })

    it('should include deadline in response', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'Todo with deadline',
          status: 'pending' as const,
          deadline: new Date('2024-12-31T23:59:59Z'),
          boardColumnId: 1,
          position: 0,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 2,
          emailId: 1,
          description: 'Todo without deadline',
          status: 'pending' as const,
          deadline: null,
          boardColumnId: 1,
          position: 1,
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockTodos)

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos[0].deadline).toBe('2024-12-31T23:59:59.000Z')
      expect(response.body.todos[1].deadline).toBeNull()
    })

    it('should include boardColumnId and position in response', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'Test todo',
          status: 'pending' as const,
          deadline: null,
          boardColumnId: 2,
          position: 5,
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockTodos)

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos[0].boardColumnId).toBe(2)
      expect(response.body.todos[0].position).toBe(5)
    })

    it('should sort by position then deadline with nulls last', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app).get('/api/todos')

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            position: 'ASC',
            deadline: expect.objectContaining({
              direction: 'ASC',
              nulls: 'LAST'
            })
          })
        })
      )
    })

    it('should filter by status', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app)
        .get('/api/todos')
        .query({ status: 'pending' })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        })
      )
    })

    it('should filter by boardColumnId', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app)
        .get('/api/todos')
        .query({ boardColumnId: 2 })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ boardColumnId: 2 }),
        })
      )
    })

    it('should filter by emailId', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app)
        .get('/api/todos')
        .query({ emailId: 1 })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ emailId: 1 }),
        })
      )
    })

    it('should combine multiple filters', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app)
        .get('/api/todos')
        .query({ status: 'pending', boardColumnId: 2 })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending',
            boardColumnId: 2,
          }),
        })
      )
    })

    it('should return empty array when no todos', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos).toEqual([])
    })
  })

  describe('PATCH /api/todos/:id/status', () => {
    it('should update todo status', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumnId: 1,
        boardColumn: { id: 1, name: 'Inbox', color: '#00FF00' },
        position: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(mockTodo as unknown as Todo)
      vi.mocked(mockRepository.save).mockResolvedValue({
        ...mockTodo,
        status: 'completed',
      } as unknown as Todo)

      const response = await request(app)
        .patch('/api/todos/1/status')
        .send({ status: 'completed' })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('completed')
    })

    it('should include color from boardColumn in response', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumnId: 2,
        boardColumn: { id: 2, name: 'Todo', color: '#FF5733' },
        position: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(mockTodo as unknown as Todo)
      vi.mocked(mockRepository.save).mockResolvedValue({
        ...mockTodo,
        status: 'completed',
      } as unknown as Todo)

      const response = await request(app)
        .patch('/api/todos/1/status')
        .send({ status: 'completed' })

      expect(response.body.color).toBe('#FF5733')
    })

    it('should request boardColumn relation in findOne', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumnId: 1,
        boardColumn: { id: 1, name: 'Inbox', color: null },
        position: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(mockTodo as unknown as Todo)
      vi.mocked(mockRepository.save).mockResolvedValue(mockTodo as unknown as Todo)

      await request(app)
        .patch('/api/todos/1/status')
        .send({ status: 'completed' })

      expect(mockRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.arrayContaining(['boardColumn']),
        })
      )
    })

    it('should include deadline in update response', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(mockTodo)
      vi.mocked(mockRepository.save).mockResolvedValue({
        ...mockTodo,
        status: 'completed',
      })

      const response = await request(app)
        .patch('/api/todos/1/status')
        .send({ status: 'completed' })

      expect(response.body.deadline).toBe('2024-12-31T23:59:59.000Z')
    })

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch('/api/todos/1/status')
        .send({ status: 'invalid' })

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent todo', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)

      const response = await request(app)
        .patch('/api/todos/999/status')
        .send({ status: 'completed' })

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/todos with date range', () => {
    it('should filter todos by date range using query builder', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'Todo in range',
          status: 'pending' as const,
          deadline: new Date('2024-03-15T23:59:59Z'),
          boardColumnId: 1,
          position: 0,
          createdAt: new Date(),
        },
      ]

      vi.mocked(mockQueryBuilder.getMany).mockResolvedValue(mockTodos)

      const response = await request(app)
        .get('/api/todos')
        .query({ startDate: '2024-03-01', endDate: '2024-03-31' })

      expect(response.status).toBe(200)
      expect(response.body.todos).toHaveLength(1)
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('todo')
    })

    it('should include todos without deadline when using date range', async () => {
      vi.mocked(mockQueryBuilder.getMany).mockResolvedValue([])

      await request(app)
        .get('/api/todos')
        .query({ startDate: '2024-03-01', endDate: '2024-03-31' })

      // Should call orWhere for null deadlines
      expect(mockQueryBuilder.orWhere).toHaveBeenCalled()
    })

    it('should ignore invalid date format', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      const response = await request(app)
        .get('/api/todos')
        .query({ startDate: 'invalid', endDate: '2024-03-31' })

      // Should fall back to regular find when date format is invalid
      expect(response.status).toBe(200)
    })

    it('should combine date range with other filters', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'High priority todo',
          status: 'pending' as const,
          deadline: new Date('2024-03-15T23:59:59Z'),
          boardColumnId: 2,
          position: 0,
          createdAt: new Date(),
        },
      ]

      vi.mocked(mockQueryBuilder.getMany).mockResolvedValue(mockTodos)

      const response = await request(app)
        .get('/api/todos')
        .query({
          startDate: '2024-03-01',
          endDate: '2024-03-31',
          status: 'pending',
          boardColumnId: 2
        })

      expect(response.status).toBe(200)
      expect(response.body.todos).toHaveLength(1)
    })
  })

  describe('PATCH /api/todos/:id/position', () => {
    it('should update todo position and column', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        boardColumnId: 2,
        position: 5,
        boardColumn: { id: 2, name: 'Todo', color: '#3B82F6' },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1/position')
        .send({ boardColumnId: 2, position: 5 })

      expect(response.status).toBe(200)
      expect(response.body.boardColumnId).toBe(2)
      expect(response.body.position).toBe(5)
    })

    it('should require boardColumnId', async () => {
      const response = await request(app)
        .patch('/api/todos/1/position')
        .send({ position: 5 })

      expect(response.status).toBe(400)
    })

    it('should allow updating deadline along with position', async () => {
      const updatedTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        boardColumnId: 2,
        position: 5,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumn: { id: 2, name: 'Todo', color: '#3B82F6' },
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1/position')
        .send({
          boardColumnId: 2,
          position: 5,
          deadline: '2024-12-31T23:59:59Z'
        })

      expect(response.status).toBe(200)
      expect(response.body.deadline).toBe('2024-12-31T23:59:59.000Z')
    })

    it('should return 404 for non-existent todo', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)

      const response = await request(app)
        .patch('/api/todos/999/position')
        .send({ boardColumnId: 2 })

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/todos/batch-position', () => {
    it('should batch update multiple todo positions', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 3, raw: {} })

      const response = await request(app)
        .post('/api/todos/batch-position')
        .send({
          updates: [
            { id: 1, boardColumnId: 2, position: 0 },
            { id: 2, boardColumnId: 2, position: 1 },
            { id: 3, boardColumnId: 2, position: 2 },
          ]
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.updated).toBe(3)
      expect(mockRepository.update).toHaveBeenCalledTimes(3)
    })

    it('should reject empty updates array', async () => {
      const response = await request(app)
        .post('/api/todos/batch-position')
        .send({ updates: [] })

      expect(response.status).toBe(200)
      expect(response.body.updated).toBe(0)
    })

    it('should reject invalid update format', async () => {
      const response = await request(app)
        .post('/api/todos/batch-position')
        .send({
          updates: [
            { id: 1, boardColumnId: 'invalid', position: 0 },
          ]
        })

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/todos/:id', () => {
    it('should update todo description', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Old description',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        description: 'New description',
        boardColumn: { id: 1, name: 'Inbox', color: null },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ description: 'New description' })

      expect(response.status).toBe(200)
      expect(response.body.description).toBe('New description')
    })

    it('should update todo deadline', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumn: { id: 1, name: 'Inbox', color: null },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ deadline: '2024-12-31T23:59:59Z' })

      expect(response.status).toBe(200)
      expect(response.body.deadline).toBe('2024-12-31T23:59:59.000Z')
    })

    it('should update todo status', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        status: 'completed',
        boardColumn: { id: 1, name: 'Inbox', color: null },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ status: 'completed' })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('completed')
    })

    it('should update todo boardColumnId', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        boardColumnId: 2,
        boardColumn: { id: 2, name: 'Todo', color: '#3B82F6' },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ boardColumnId: 2 })

      expect(response.status).toBe(200)
      expect(response.body.boardColumnId).toBe(2)
    })

    it('should update todo position', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        position: 10,
        boardColumn: { id: 1, name: 'Inbox', color: null },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ position: 10 })

      expect(response.status).toBe(200)
      expect(response.body.position).toBe(10)
    })

    it('should update multiple fields at once', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Old',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        description: 'New',
        status: 'in_progress',
        boardColumnId: 2,
        position: 5,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumn: { id: 2, name: 'Todo', color: '#3B82F6' },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({
          description: 'New',
          status: 'in_progress',
          boardColumnId: 2,
          position: 5,
          deadline: '2024-12-31T23:59:59Z'
        })

      expect(response.status).toBe(200)
      expect(response.body.description).toBe('New')
      expect(response.body.status).toBe('in_progress')
      expect(response.body.boardColumnId).toBe(2)
      expect(response.body.position).toBe(5)
    })

    it('should set deadline to null', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        status: 'pending' as const,
        deadline: new Date('2024-12-31T23:59:59Z'),
        boardColumnId: 1,
        position: 0,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        deadline: null,
        boardColumn: { id: 1, name: 'Inbox', color: null },
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ deadline: null })

      expect(response.status).toBe(200)
      expect(response.body.deadline).toBeNull()
    })

    it('should reject unknown fields in update', async () => {
      const response = await request(app)
        .patch('/api/todos/1')
        .send({ unknownField: 'value' })

      expect(response.status).toBe(400)
    })

    it('should reject invalid status value', async () => {
      const response = await request(app)
        .patch('/api/todos/1')
        .send({ status: 'invalid' })

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent todo', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)

      const response = await request(app)
        .patch('/api/todos/999')
        .send({ description: 'New description' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/todos/:id', () => {
    it('should delete todo and return 204', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app).delete('/api/todos/1')

      expect(response.status).toBe(204)
      expect(response.body).toEqual({})
    })

    it('should return 404 for non-existent todo', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 0, raw: {} })

      const response = await request(app).delete('/api/todos/999')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Todo not found')
    })

    it('should handle invalid id format', async () => {
      const response = await request(app).delete('/api/todos/invalid')

      expect(response.status).toBe(400)
    })
  })

  describe('PATCH /api/todos/:id - notes field', () => {
    it('should update todo notes', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test todo',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        boardColumn: { id: 1, name: 'Inbox', color: null },
        position: 0,
        notes: null,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        notes: 'This is a note',
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo as unknown as Todo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ notes: 'This is a note' })

      expect(response.status).toBe(200)
      expect(response.body.notes).toBe('This is a note')
    })

    it('should set notes to null (clear notes)', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test todo',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        boardColumn: { id: 1, name: 'Inbox', color: null },
        position: 0,
        notes: 'Existing note',
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        notes: null,
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo as unknown as Todo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ notes: null })

      expect(response.status).toBe(200)
      expect(response.body.notes).toBeNull()
    })

    it('should include notes in update response', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test todo',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        boardColumn: { id: 1, name: 'Inbox', color: null },
        position: 0,
        notes: 'Note content',
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo as unknown as Todo)
        .mockResolvedValueOnce(mockTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ description: 'Updated description' })

      expect(response.status).toBe(200)
      expect(response.body.notes).toBe('Note content')
    })

    it('should reject notes exceeding 2000 characters', async () => {
      const response = await request(app)
        .patch('/api/todos/1')
        .send({ notes: 'a'.repeat(2001) })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid request body')
    })

    it('should accept notes with exactly 2000 characters', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test todo',
        status: 'pending' as const,
        deadline: null,
        boardColumnId: 1,
        boardColumn: { id: 1, name: 'Inbox', color: null },
        position: 0,
        notes: null,
        createdAt: new Date(),
      }

      const updatedTodo = {
        ...mockTodo,
        notes: 'a'.repeat(2000),
      }

      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce(mockTodo as unknown as Todo)
        .mockResolvedValueOnce(updatedTodo as unknown as Todo)
      vi.mocked(mockRepository.update).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app)
        .patch('/api/todos/1')
        .send({ notes: 'a'.repeat(2000) })

      expect(response.status).toBe(200)
      expect(response.body.notes).toHaveLength(2000)
    })
  })

  describe('GET /api/todos - notes field', () => {
    it('should include notes in response when present', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'Test todo',
          status: 'pending' as const,
          deadline: null,
          boardColumnId: 1,
          boardColumn: { id: 1, name: 'Inbox', color: null },
          position: 0,
          notes: 'Important notes here',
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockTodos as unknown as Todo[])

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos[0].notes).toBe('Important notes here')
    })

    it('should return null notes when not set', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'Test todo',
          status: 'pending' as const,
          deadline: null,
          boardColumnId: 1,
          boardColumn: { id: 1, name: 'Inbox', color: null },
          position: 0,
          notes: null,
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockTodos as unknown as Todo[])

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos[0].notes).toBeNull()
    })
  })
})
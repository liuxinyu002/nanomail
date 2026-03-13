import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createTodoRoutes } from './todo.routes'
import type { DataSource, Repository } from 'typeorm'
import { Todo } from '../entities/Todo.entity'

describe('TodoRoutes', () => {
  let app: express.Application
  let mockDataSource: DataSource
  let mockRepository: Repository<Todo>

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      createQueryBuilder: vi.fn(),
    } as unknown as Repository<Todo>

    // Create mock data source
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
      isInitialized: true,
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
          urgency: 'high',
          status: 'pending',
          deadline: new Date('2024-12-31T23:59:59Z'),
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockTodos)

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos).toHaveLength(1)
    })

    it('should include deadline in response', async () => {
      const mockTodos = [
        {
          id: 1,
          emailId: 1,
          description: 'Todo with deadline',
          urgency: 'high',
          status: 'pending',
          deadline: new Date('2024-12-31T23:59:59Z'),
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 2,
          emailId: 1,
          description: 'Todo without deadline',
          urgency: 'low',
          status: 'pending',
          deadline: null,
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockTodos)

      const response = await request(app).get('/api/todos')

      expect(response.status).toBe(200)
      expect(response.body.todos[0].deadline).toBe('2024-12-31T23:59:59.000Z')
      expect(response.body.todos[1].deadline).toBeNull()
    })

    it('should sort by deadline with nulls last', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app).get('/api/todos')

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
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

    it('should filter by urgency', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app)
        .get('/api/todos')
        .query({ urgency: 'high' })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ urgency: 'high' }),
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
        .query({ status: 'pending', urgency: 'high' })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending',
            urgency: 'high',
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
        urgency: 'high' as const,
        status: 'pending' as const,
        deadline: new Date('2024-12-31T23:59:59Z'),
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

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('completed')
    })

    it('should include deadline in update response', async () => {
      const mockTodo = {
        id: 1,
        emailId: 1,
        description: 'Test',
        urgency: 'high' as const,
        status: 'pending' as const,
        deadline: new Date('2024-12-31T23:59:59Z'),
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
})
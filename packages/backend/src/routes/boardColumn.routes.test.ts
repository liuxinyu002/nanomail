import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createBoardColumnRoutes } from './boardColumn.routes'
import type { DataSource, Repository } from 'typeorm'
import { BoardColumn } from '../entities/BoardColumn.entity'

describe('BoardColumnRoutes', () => {
  let app: express.Application
  let mockDataSource: DataSource
  let mockRepository: Repository<BoardColumn>

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    } as unknown as Repository<BoardColumn>

    // Create mock data source
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
      isInitialized: true,
    } as unknown as DataSource

    // Create express app with routes
    app = express()
    app.use(express.json())
    app.use('/api/board-columns', createBoardColumnRoutes(mockDataSource))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/board-columns', () => {
    it('should return list of board columns with todo counts', async () => {
      const mockColumns = [
        {
          id: 1,
          name: '收件箱',
          color: '#6366f1',
          order: 0,
          isSystem: 1,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 2,
          name: '待处理',
          color: '#f59e0b',
          order: 1,
          isSystem: 0,
          createdAt: new Date('2024-01-15'),
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockColumns)

      const response = await request(app).get('/api/board-columns')

      expect(response.status).toBe(200)
      expect(response.body.columns).toHaveLength(2)
      expect(response.body.columns[0].name).toBe('收件箱')
      expect(response.body.columns[0].isSystem).toBe(true)
    })

    it('should return columns sorted by order', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      await request(app).get('/api/board-columns')

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { order: 'ASC' }
        })
      )
    })

    it('should return empty array when no columns', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])

      const response = await request(app).get('/api/board-columns')

      expect(response.status).toBe(200)
      expect(response.body.columns).toEqual([])
    })
  })

  describe('POST /api/board-columns', () => {
    it('should create a new column', async () => {
      const newColumn = {
        name: '审核中',
        color: '#10b981',
        order: 4,
      }

      const savedColumn = {
        id: 5,
        ...newColumn,
        isSystem: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockReturnValue(savedColumn as BoardColumn)
      vi.mocked(mockRepository.save).mockResolvedValue(savedColumn as BoardColumn)

      const response = await request(app)
        .post('/api/board-columns')
        .send(newColumn)

      expect(response.status).toBe(201)
      expect(response.body.name).toBe('审核中')
      expect(response.body.isSystem).toBe(false)
    })

    it('should reject empty name', async () => {
      const response = await request(app)
        .post('/api/board-columns')
        .send({ name: '', color: '#000000', order: 5 })

      expect(response.status).toBe(400)
    })

    it('should reject name longer than 50 characters', async () => {
      const response = await request(app)
        .post('/api/board-columns')
        .send({ name: 'a'.repeat(51), color: '#000000', order: 5 })

      expect(response.status).toBe(400)
    })

    it('should default isSystem to false', async () => {
      const newColumn = {
        name: 'New Column',
        color: '#000000',
        order: 5,
      }

      const savedColumn = {
        id: 6,
        ...newColumn,
        isSystem: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.create).mockReturnValue(savedColumn as BoardColumn)
      vi.mocked(mockRepository.save).mockResolvedValue(savedColumn as BoardColumn)

      const response = await request(app)
        .post('/api/board-columns')
        .send(newColumn)

      expect(response.body.isSystem).toBe(false)
    })
  })

  describe('PATCH /api/board-columns/:id', () => {
    it('should update column name', async () => {
      const existingColumn = {
        id: 2,
        name: '待处理',
        color: '#f59e0b',
        order: 1,
        isSystem: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(existingColumn as BoardColumn)
      vi.mocked(mockRepository.save).mockResolvedValue({
        ...existingColumn,
        name: '待办',
      } as BoardColumn)

      const response = await request(app)
        .patch('/api/board-columns/2')
        .send({ name: '待办' })

      expect(response.status).toBe(200)
      expect(response.body.name).toBe('待办')
    })

    it('should update column color', async () => {
      const existingColumn = {
        id: 2,
        name: '待处理',
        color: '#f59e0b',
        order: 1,
        isSystem: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(existingColumn as BoardColumn)
      vi.mocked(mockRepository.save).mockResolvedValue({
        ...existingColumn,
        color: '#3b82f6',
      } as BoardColumn)

      const response = await request(app)
        .patch('/api/board-columns/2')
        .send({ color: '#3b82f6' })

      expect(response.status).toBe(200)
      expect(response.body.color).toBe('#3b82f6')
    })

    it('should return 404 for non-existent column', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)

      const response = await request(app)
        .patch('/api/board-columns/999')
        .send({ name: 'New Name' })

      expect(response.status).toBe(404)
    })

    it('should reject unknown fields', async () => {
      const response = await request(app)
        .patch('/api/board-columns/2')
        .send({ unknownField: 'value' })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/board-columns/:id', () => {
    it('should delete a non-system column', async () => {
      const existingColumn = {
        id: 5,
        name: 'Custom Column',
        color: '#000000',
        order: 4,
        isSystem: 0,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(existingColumn as BoardColumn)
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 1, raw: {} })

      const response = await request(app).delete('/api/board-columns/5')

      expect(response.status).toBe(204)
    })

    it('should reject deletion of system column (Inbox)', async () => {
      const systemColumn = {
        id: 1,
        name: '收件箱',
        color: '#6366f1',
        order: 0,
        isSystem: 1,
        createdAt: new Date(),
      }

      vi.mocked(mockRepository.findOne).mockResolvedValue(systemColumn as BoardColumn)

      const response = await request(app).delete('/api/board-columns/1')

      expect(response.status).toBe(403)
      expect(response.body.error).toContain('system column')
    })

    it('should return 404 for non-existent column', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null)

      const response = await request(app).delete('/api/board-columns/999')

      expect(response.status).toBe(404)
    })

    it('should handle invalid id format', async () => {
      const response = await request(app).delete('/api/board-columns/invalid')

      expect(response.status).toBe(400)
    })
  })
})
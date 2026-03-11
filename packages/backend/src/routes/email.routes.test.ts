import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createEmailRoutes } from './email.routes'
import type { DataSource, Repository } from 'typeorm'
import { Email } from '../entities/Email.entity'

describe('EmailRoutes', () => {
  let app: express.Application
  let mockDataSource: DataSource
  let mockRepository: Repository<Email>

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(),
      count: vi.fn(),
      createQueryBuilder: vi.fn(),
    } as unknown as Repository<Email>

    // Create mock data source
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
      isInitialized: true,
    } as unknown as DataSource

    // Create express app with routes
    app = express()
    app.use(express.json())
    app.use('/api/emails', createEmailRoutes(mockDataSource))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/emails', () => {
    it('should return paginated list of emails', async () => {
      const mockEmails = [
        {
          id: 1,
          subject: 'Test Email',
          sender: 'sender@example.com',
          snippet: 'Test snippet',
          date: new Date('2024-01-15'),
          isProcessed: false,
          isSpam: false,
          hasAttachments: false,
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockEmails)
      vi.mocked(mockRepository.count).mockResolvedValue(1)

      const response = await request(app).get('/api/emails')

      expect(response.status).toBe(200)
      expect(response.body.emails).toHaveLength(1)
      expect(response.body.pagination).toBeDefined()
      expect(response.body.pagination.total).toBe(1)
    })

    it('should support pagination parameters', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const response = await request(app)
        .get('/api/emails')
        .query({ page: 2, limit: 20 })

      expect(response.status).toBe(200)
      expect(response.body.pagination.page).toBe(2)
      expect(response.body.pagination.limit).toBe(20)
    })

    it('should filter by processed status', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      await request(app)
        .get('/api/emails')
        .query({ processed: true })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isProcessed: true }),
        })
      )
    })

    it('should filter by spam status', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      await request(app)
        .get('/api/emails')
        .query({ spam: true })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isSpam: true }),
        })
      )
    })

    it('should use default pagination values', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const response = await request(app).get('/api/emails')

      expect(response.body.pagination.page).toBe(1)
      expect(response.body.pagination.limit).toBe(10)
    })
  })

  describe('POST /api/emails/process', () => {
    it('should queue emails for processing', async () => {
      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce({ id: 1, isProcessed: false } as Email)
        .mockResolvedValueOnce({ id: 2, isProcessed: false } as Email)
      vi.mocked(mockRepository.save).mockResolvedValue({} as Email)

      const response = await request(app)
        .post('/api/emails/process')
        .send({ emailIds: [1, 2] })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.queuedCount).toBe(2)
    })

    it('should reject more than 5 emails', async () => {
      const response = await request(app)
        .post('/api/emails/process')
        .send({ emailIds: [1, 2, 3, 4, 5, 6] })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Maximum 5 emails')
    })

    it('should reject empty emailIds array', async () => {
      const response = await request(app)
        .post('/api/emails/process')
        .send({ emailIds: [] })

      expect(response.status).toBe(400)
    })

    it('should reject missing emailIds', async () => {
      const response = await request(app)
        .post('/api/emails/process')
        .send({})

      expect(response.status).toBe(400)
    })

    it('should skip already processed emails', async () => {
      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce({ id: 1, isProcessed: true } as Email)
        .mockResolvedValueOnce({ id: 2, isProcessed: false } as Email)
      vi.mocked(mockRepository.save).mockResolvedValue({} as Email)

      const response = await request(app)
        .post('/api/emails/process')
        .send({ emailIds: [1, 2] })

      expect(response.body.queuedCount).toBe(1)
    })

    it('should skip non-existent emails', async () => {
      vi.mocked(mockRepository.findOne)
        .mockResolvedValueOnce({ id: 1, isProcessed: false } as Email)
        .mockResolvedValueOnce(null)

      const response = await request(app)
        .post('/api/emails/process')
        .send({ emailIds: [1, 999] })

      expect(response.body.queuedCount).toBe(1)
    })
  })
})
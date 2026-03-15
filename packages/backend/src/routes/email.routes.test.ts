import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createEmailRoutes } from './email.routes'
import type { DataSource, Repository } from 'typeorm'
import type { EmailSyncService } from '../services/EmailSyncService'
import type { JobService } from '../services/JobService'
import type { AsyncSyncExecutor } from '../services/AsyncSyncExecutor'
import type { SmtpService } from '../services/SmtpService'
import { Email } from '../entities/Email.entity'

describe('EmailRoutes', () => {
  let app: express.Application
  let mockDataSource: DataSource
  let mockRepository: Repository<Email>
  let mockEmailSyncService: EmailSyncService
  let mockJobService: JobService
  let mockAsyncSyncExecutor: AsyncSyncExecutor
  let mockSmtpService: SmtpService

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

    // Create mock EmailSyncService
    mockEmailSyncService = {
      sync: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
      isPolling: vi.fn(),
    } as unknown as EmailSyncService

    // Create mock JobService
    mockJobService = {
      createJob: vi.fn().mockReturnValue('test-job-uuid'),
      getJob: vi.fn(),
      findActiveJobByAccountId: vi.fn(),
      updateJob: vi.fn(),
    } as unknown as JobService

    // Create mock AsyncSyncExecutor
    mockAsyncSyncExecutor = {
      executeSync: vi.fn().mockResolvedValue(undefined),
    } as unknown as AsyncSyncExecutor

    // Create mock SmtpService
    mockSmtpService = {
      sendEmail: vi.fn(),
      testConnection: vi.fn(),
      getConfig: vi.fn(),
    } as unknown as SmtpService

    // Create express app with routes
    app = express()
    app.use(express.json())
    app.use('/api/emails', createEmailRoutes(
      mockDataSource,
      mockEmailSyncService,
      mockJobService,
      mockAsyncSyncExecutor,
      mockSmtpService
    ))
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
          summary: 'AI summary',
          date: new Date('2024-01-15'),
          isProcessed: false,
          classification: 'IMPORTANT',
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

    it('should include classification and computed isSpam in response', async () => {
      const mockEmails = [
        {
          id: 1,
          subject: 'Spam Email',
          sender: 'spam@spam.com',
          snippet: 'Spam content',
          summary: null,
          date: new Date('2024-01-15'),
          isProcessed: true,
          classification: 'SPAM',
          hasAttachments: false,
        },
        {
          id: 2,
          subject: 'Newsletter',
          sender: 'newsletter@news.com',
          snippet: 'Newsletter content',
          summary: 'Weekly newsletter',
          date: new Date('2024-01-15'),
          isProcessed: true,
          classification: 'NEWSLETTER',
          hasAttachments: false,
        },
      ]

      vi.mocked(mockRepository.find).mockResolvedValue(mockEmails)
      vi.mocked(mockRepository.count).mockResolvedValue(2)

      const response = await request(app).get('/api/emails')

      expect(response.status).toBe(200)
      // First email is SPAM - isSpam should be true
      expect(response.body.emails[0].classification).toBe('SPAM')
      expect(response.body.emails[0].isSpam).toBe(true)
      // Second email is NEWSLETTER - isSpam should be false
      expect(response.body.emails[1].classification).toBe('NEWSLETTER')
      expect(response.body.emails[1].isSpam).toBe(false)
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

    it('should filter by classification', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      await request(app)
        .get('/api/emails')
        .query({ classification: 'IMPORTANT' })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ classification: 'IMPORTANT' }),
        })
      )
    })

    it('should filter by SPAM classification', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      await request(app)
        .get('/api/emails')
        .query({ classification: 'SPAM' })

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ classification: 'SPAM' }),
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

  describe('POST /api/emails/sync', () => {
    it('should create a new sync job and return jobId', async () => {
      const response = await request(app)
        .post('/api/emails/sync')
        .send({ accountId: 1 })

      expect(response.status).toBe(200)
      expect(response.body.jobId).toBe('test-job-uuid')
      expect(response.body.status).toBe('pending')
    })

    it('should trigger async sync execution', async () => {
      await request(app)
        .post('/api/emails/sync')
        .send({ accountId: 1 })

      expect(mockJobService.createJob).toHaveBeenCalledWith(1)
      expect(mockAsyncSyncExecutor.executeSync).toHaveBeenCalledWith('test-job-uuid', 1)
    })

    it('should return existing job if active job exists for account', async () => {
      vi.mocked(mockJobService.findActiveJobByAccountId).mockReturnValue({
        id: 'existing-job-id',
        accountId: 1,
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await request(app)
        .post('/api/emails/sync')
        .send({ accountId: 1 })

      expect(response.status).toBe(200)
      expect(response.body.jobId).toBe('existing-job-id')
      expect(response.body.status).toBe('running')
      expect(mockJobService.createJob).not.toHaveBeenCalled()
    })

    it('should use default accountId if not provided', async () => {
      const response = await request(app)
        .post('/api/emails/sync')
        .send({})

      expect(response.status).toBe(200)
      expect(mockJobService.createJob).toHaveBeenCalledWith(1)
    })

    it('should handle executor errors gracefully', async () => {
      vi.mocked(mockAsyncSyncExecutor.executeSync).mockRejectedValue(new Error('Executor error'))

      // Should still return success immediately
      const response = await request(app)
        .post('/api/emails/sync')
        .send({ accountId: 1 })

      expect(response.status).toBe(200)
      expect(response.body.jobId).toBe('test-job-uuid')
    })
  })

  describe('GET /api/emails/sync/:jobId', () => {
    it('should return job status for existing job', async () => {
      const mockJob = {
        id: 'test-job-id',
        accountId: 1,
        status: 'running',
        progress: 50,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:01:00Z'),
      }
      vi.mocked(mockJobService.getJob).mockReturnValue(mockJob)

      const response = await request(app)
        .get('/api/emails/sync/test-job-id')

      expect(response.status).toBe(200)
      expect(response.body.id).toBe('test-job-id')
      expect(response.body.status).toBe('running')
      expect(response.body.progress).toBe(50)
    })

    it('should return 404 for non-existent job', async () => {
      vi.mocked(mockJobService.getJob).mockReturnValue(undefined)

      const response = await request(app)
        .get('/api/emails/sync/non-existent-id')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('JOB_NOT_FOUND')
      expect(response.body.message).toContain('Task does not exist or has expired')
    })

    it('should return completed job with result', async () => {
      const mockJob = {
        id: 'completed-job-id',
        accountId: 1,
        status: 'completed',
        result: { syncedCount: 10, errors: [] },
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:05:00Z'),
      }
      vi.mocked(mockJobService.getJob).mockReturnValue(mockJob)

      const response = await request(app)
        .get('/api/emails/sync/completed-job-id')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('completed')
      expect(response.body.result.syncedCount).toBe(10)
    })

    it('should return failed job with error', async () => {
      const mockJob = {
        id: 'failed-job-id',
        accountId: 1,
        status: 'failed',
        error: 'Connection timeout',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:02:00Z'),
      }
      vi.mocked(mockJobService.getJob).mockReturnValue(mockJob)

      const response = await request(app)
        .get('/api/emails/sync/failed-job-id')

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('failed')
      expect(response.body.error).toBe('Connection timeout')
    })

    it('should handle job with progress', async () => {
      const mockJob = {
        id: 'progress-job-id',
        accountId: 1,
        status: 'running',
        progress: 75,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:03:00Z'),
      }
      vi.mocked(mockJobService.getJob).mockReturnValue(mockJob)

      const response = await request(app)
        .get('/api/emails/sync/progress-job-id')

      expect(response.status).toBe(200)
      expect(response.body.progress).toBe(75)
    })
  })

  describe('POST /api/emails/send', () => {
    it('should send an email successfully', async () => {
      vi.mocked(mockSmtpService.sendEmail).mockResolvedValue({
        success: true,
        messageId: '<test-message-id@example.com>',
      })

      const response = await request(app)
        .post('/api/emails/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test body content',
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.messageId).toBe('<test-message-id@example.com>')
      expect(mockSmtpService.sendEmail).toHaveBeenCalledWith({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
        replyTo: undefined,
        isHtml: false,
      })
    })

    it('should send HTML email when isHtml is true', async () => {
      vi.mocked(mockSmtpService.sendEmail).mockResolvedValue({
        success: true,
        messageId: '<html-message-id@example.com>',
      })

      const response = await request(app)
        .post('/api/emails/send')
        .send({
          to: 'recipient@example.com',
          subject: 'HTML Email',
          body: '<p>HTML content</p>',
          isHtml: true,
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(mockSmtpService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ isHtml: true })
      )
    })

    it('should include replyTo when provided', async () => {
      vi.mocked(mockSmtpService.sendEmail).mockResolvedValue({
        success: true,
        messageId: '<reply-message-id@example.com>',
      })

      const response = await request(app)
        .post('/api/emails/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Reply Test',
          body: 'Body',
          replyTo: 'original@example.com',
        })

      expect(response.status).toBe(200)
      expect(mockSmtpService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: 'original@example.com' })
      )
    })

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/emails/send')
        .send({
          to: 'invalid-email',
          subject: 'Test',
          body: 'Body',
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Validation failed')
    })

    it('should return 400 for missing subject', async () => {
      const response = await request(app)
        .post('/api/emails/send')
        .send({
          to: 'recipient@example.com',
          body: 'Body',
        })

      expect(response.status).toBe(400)
    })

    it('should return 400 for missing body', async () => {
      const response = await request(app)
        .post('/api/emails/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test',
        })

      expect(response.status).toBe(400)
    })

    it('should return 500 when email send fails', async () => {
      vi.mocked(mockSmtpService.sendEmail).mockResolvedValue({
        success: false,
        error: 'SMTP connection failed',
      })

      const response = await request(app)
        .post('/api/emails/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test',
          body: 'Body',
        })

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('SMTP connection failed')
    })

    it('should return 503 when SMTP service is not available', async () => {
      // Create app without SMTP service
      const appWithoutSmtp = express()
      appWithoutSmtp.use(express.json())
      appWithoutSmtp.use('/api/emails', createEmailRoutes(
        mockDataSource,
        mockEmailSyncService,
        mockJobService,
        mockAsyncSyncExecutor
        // No SMTP service passed
      ))

      const response = await request(appWithoutSmtp)
        .post('/api/emails/send')
        .send({
          to: 'recipient@example.com',
          subject: 'Test',
          body: 'Body',
        })

      expect(response.status).toBe(503)
      expect(response.body.error).toBe('SMTP service not configured')
    })
  })
})
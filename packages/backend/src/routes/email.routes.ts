import { Router } from 'express'
import type { DataSource } from 'typeorm'
import { Email } from '../entities/Email.entity'
import type { EmailSyncService } from '../services/EmailSyncService'
import type { JobService } from '../services/JobService'
import type { AsyncSyncExecutor } from '../services/AsyncSyncExecutor'
import { createLogger } from '../config/logger.js'

const log = createLogger('EmailRoutes')

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  page?: number
  limit?: number
}

/**
 * Emails query parameters
 */
export interface EmailsQuery extends PaginationQuery {
  processed?: boolean
  spam?: boolean
}

/**
 * Paginated response for emails
 */
export interface EmailsResponse {
  emails: Array<{
    id: number
    subject: string | null
    sender: string | null
    snippet: string | null
    summary: string | null
    date: string
    isProcessed: boolean
    isSpam: boolean
    hasAttachments: boolean
  }>
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Process emails request
 */
export interface ProcessEmailsRequest {
  emailIds: number[]
}

/**
 * Process emails response
 */
export interface ProcessEmailsResponse {
  success: boolean
  queuedCount: number
  message: string
}

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_EMAILS_PER_BATCH = 5

/**
 * Creates Express routes for email operations.
 */
export function createEmailRoutes(
  dataSource: DataSource,
  _emailSyncService?: EmailSyncService,
  _jobService?: JobService,
  _asyncSyncExecutor?: AsyncSyncExecutor
): Router {
  const router = Router()
  const emailRepository = dataSource.getRepository(Email)

  // GET /api/emails - List emails with pagination
  router.get('/', async (req, res, next) => {
    try {
      // Parse query parameters
      const page = parseInt(req.query.page as string) || DEFAULT_PAGE
      const limit = Math.min(
        parseInt(req.query.limit as string) || DEFAULT_LIMIT,
        100
      )
      const processed = req.query.processed === 'true'
      const spam = req.query.spam === 'true'

      // Build where clause
      const where: Record<string, unknown> = {}
      if (req.query.processed !== undefined) {
        where.isProcessed = processed
      }
      if (req.query.spam !== undefined) {
        where.isSpam = spam
      }

      // Get total count
      const total = await emailRepository.count({ where })

      // Get paginated results
      const emails = await emailRepository.find({
        where,
        order: { date: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      })

      // Format response
      const response: EmailsResponse = {
        emails: emails.map((email) => ({
          id: email.id,
          subject: email.subject,
          sender: email.sender,
          snippet: email.snippet,
          summary: email.summary,
          date: email.date.toISOString(),
          isProcessed: email.isProcessed,
          isSpam: email.isSpam,
          hasAttachments: email.hasAttachments,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  })

  // POST /api/emails/process - Queue emails for AI processing
  router.post('/process', async (req, res, next) => {
    try {
      const { emailIds } = req.body as ProcessEmailsRequest

      // Validate input
      if (!emailIds || !Array.isArray(emailIds)) {
        res.status(400).json({ error: 'emailIds array is required' })
        return
      }

      if (emailIds.length === 0) {
        res.status(400).json({ error: 'emailIds cannot be empty' })
        return
      }

      if (emailIds.length > MAX_EMAILS_PER_BATCH) {
        res.status(400).json({
          error: `Maximum ${MAX_EMAILS_PER_BATCH} emails per batch`,
        })
        return
      }

      // Queue emails for processing
      let queuedCount = 0
      for (const emailId of emailIds) {
        const email = await emailRepository.findOne({
          where: { id: emailId },
        })

        // Skip non-existent or already processed emails
        if (!email || email.isProcessed) {
          continue
        }

        // Mark as queued for processing (in real implementation, this would trigger AI pipeline)
        email.isProcessed = true // Placeholder - in Phase 3 this will be handled by AI pipeline
        await emailRepository.save(email)
        queuedCount++
      }

      const response: ProcessEmailsResponse = {
        success: true,
        queuedCount,
        message: `Queued ${queuedCount} email(s) for processing`,
      }

      res.json(response)
    } catch (error) {
      next(error)
    }
  })

  // POST /api/emails/sync - Trigger async email sync
  router.post('/sync', async (req, res, next) => {
    try {
      // Check if services are available
      if (!_jobService || !_asyncSyncExecutor) {
        res.status(503).json({ error: 'Sync service not available' })
        return
      }

      const accountId = req.body.accountId ?? 1

      // Concurrency protection: check for existing active job
      const existingJob = _jobService.findActiveJobByAccountId(accountId)
      if (existingJob) {
        res.json({ jobId: existingJob.id, status: existingJob.status })
        return
      }

      // Create new job
      const jobId = _jobService.createJob(accountId)

      // Execute sync asynchronously (don't await)
      _asyncSyncExecutor.executeSync(jobId, accountId).catch((error) => {
        log.error({ err: error, jobId, accountId }, 'Async sync failed')
      })

      res.json({ jobId, status: 'pending' })
    } catch (error) {
      next(error)
    }
  })

  // GET /api/emails/sync/:jobId - Get sync job status
  router.get('/sync/:jobId', (req, res) => {
    if (!_jobService) {
      res.status(503).json({ error: 'Sync service not available' })
      return
    }

    const job = _jobService.getJob(req.params.jobId)

    if (!job) {
      // Server restart would lose jobs, return 404
      res.status(404).json({
        error: 'JOB_NOT_FOUND',
        message: 'Task does not exist or has expired. Please re-sync.',
      })
      return
    }

    res.json(job)
  })

  return router
}
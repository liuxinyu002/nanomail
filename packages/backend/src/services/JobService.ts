import { randomUUID } from 'crypto'
import type { SyncJob, SyncJobStatus } from '@nanomail/shared'
import { createLogger, type Logger } from '../config/logger.js'

/**
 * JobService - In-memory job status management for async sync operations
 *
 * Features:
 * - Create and track sync jobs by ID
 * - Concurrency protection via findActiveJobByAccountId
 * - TTL cleanup for completed/failed jobs (5 minutes)
 */
export class JobService {
  private readonly log: Logger
  private jobs: Map<string, SyncJob> = new Map()
  private readonly JOB_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds

  constructor() {
    this.log = createLogger('JobService')
  }

  /**
   * Create a new sync job for an account
   * @param accountId - The account ID to sync
   * @returns The job ID
   */
  createJob(accountId: number): string {
    const jobId = randomUUID()
    const now = new Date()

    const job: SyncJob = {
      id: jobId,
      accountId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    this.jobs.set(jobId, job)
    this.log.debug({ jobId, accountId }, 'Created new sync job')

    return jobId
  }

  /**
   * Get a job by ID
   * @param jobId - The job ID
   * @returns The job or undefined if not found
   */
  getJob(jobId: string): SyncJob | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Find an active (pending or running) job for an account
   * Used for concurrency protection
   * @param accountId - The account ID
   * @returns The active job or undefined if none exists
   */
  findActiveJobByAccountId(accountId: number): SyncJob | undefined {
    for (const job of this.jobs.values()) {
      if (job.accountId === accountId &&
          (job.status === 'pending' || job.status === 'running')) {
        return job
      }
    }
    return undefined
  }

  /**
   * Update a job's status and other fields
   * @param jobId - The job ID
   * @param update - Partial job update
   */
  updateJob(jobId: string, update: Partial<SyncJob>): void {
    const job = this.jobs.get(jobId)

    if (!job) {
      this.log.warn({ jobId }, 'Attempted to update non-existent job')
      return
    }

    const updatedJob: SyncJob = {
      ...job,
      ...update,
      updatedAt: new Date(),
    }

    this.jobs.set(jobId, updatedJob)
    this.log.debug({ jobId, status: update.status }, 'Updated job')

    // Schedule TTL cleanup for completed/failed jobs
    if (update.status === 'completed' || update.status === 'failed') {
      setTimeout(() => {
        this.jobs.delete(jobId)
        this.log.debug({ jobId }, 'Cleaned up completed job')
      }, this.JOB_TTL)
    }
  }
}
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JobService } from './JobService'
import type { SyncJob, SyncJobStatus } from '@nanomail/shared'

// Mock crypto.randomUUID to return sequential UUIDs
let uuidCounter = 0
vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => {
    uuidCounter++
    return `test-uuid-${uuidCounter.toString().padStart(4, '0')}`
  }),
}))

describe('JobService', () => {
  let jobService: JobService

  beforeEach(() => {
    vi.useFakeTimers()
    uuidCounter = 0
    jobService = new JobService()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('createJob', () => {
    it('should create a new job with pending status', () => {
      const accountId = 1
      const jobId = jobService.createJob(accountId)

      expect(jobId).toBe('test-uuid-0001')

      const job = jobService.getJob(jobId)
      expect(job).toBeDefined()
      expect(job?.accountId).toBe(accountId)
      expect(job?.status).toBe('pending')
      expect(job?.createdAt).toBeInstanceOf(Date)
      expect(job?.updatedAt).toBeInstanceOf(Date)
    })

    it('should create unique job IDs for different jobs', () => {
      const jobId1 = jobService.createJob(1)
      const jobId2 = jobService.createJob(1)

      expect(jobId1).not.toBe(jobId2)
      expect(jobId1).toBe('test-uuid-0001')
      expect(jobId2).toBe('test-uuid-0002')
    })
  })

  describe('getJob', () => {
    it('should return undefined for non-existent job', () => {
      const job = jobService.getJob('non-existent-id')
      expect(job).toBeUndefined()
    })

    it('should return the job for existing jobId', () => {
      const jobId = jobService.createJob(1)
      const job = jobService.getJob(jobId)

      expect(job).toBeDefined()
      expect(job?.id).toBe(jobId)
    })
  })

  describe('findActiveJobByAccountId', () => {
    it('should return undefined when no active job exists for account', () => {
      const activeJob = jobService.findActiveJobByAccountId(1)
      expect(activeJob).toBeUndefined()
    })

    it('should return pending job for account', () => {
      const jobId = jobService.createJob(1)

      const activeJob = jobService.findActiveJobByAccountId(1)

      expect(activeJob).toBeDefined()
      expect(activeJob?.id).toBe(jobId)
      expect(activeJob?.status).toBe('pending')
    })

    it('should return running job for account', () => {
      const jobId = jobService.createJob(1)
      jobService.updateJob(jobId, { status: 'running' })

      const activeJob = jobService.findActiveJobByAccountId(1)

      expect(activeJob).toBeDefined()
      expect(activeJob?.status).toBe('running')
    })

    it('should not return completed job for account', () => {
      const jobId = jobService.createJob(1)
      jobService.updateJob(jobId, { status: 'completed', result: { syncedCount: 5, errors: [] } })

      const activeJob = jobService.findActiveJobByAccountId(1)

      expect(activeJob).toBeUndefined()
    })

    it('should not return failed job for account', () => {
      const jobId = jobService.createJob(1)
      jobService.updateJob(jobId, { status: 'failed', error: 'Test error' })

      const activeJob = jobService.findActiveJobByAccountId(1)

      expect(activeJob).toBeUndefined()
    })

    it('should return job for correct account only', () => {
      const jobId1 = jobService.createJob(1)
      jobService.createJob(2)

      const activeJob = jobService.findActiveJobByAccountId(1)

      expect(activeJob?.id).toBe(jobId1)
    })
  })

  describe('updateJob', () => {
    it('should update job status', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, { status: 'running' })

      const job = jobService.getJob(jobId)
      expect(job?.status).toBe('running')
    })

    it('should update job progress', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, { progress: 50 })

      const job = jobService.getJob(jobId)
      expect(job?.progress).toBe(50)
    })

    it('should update job result', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, {
        status: 'completed',
        result: { syncedCount: 10, errors: [] }
      })

      const job = jobService.getJob(jobId)
      expect(job?.status).toBe('completed')
      expect(job?.result).toEqual({ syncedCount: 10, errors: [] })
    })

    it('should update job error', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, { status: 'failed', error: 'Connection failed' })

      const job = jobService.getJob(jobId)
      expect(job?.status).toBe('failed')
      expect(job?.error).toBe('Connection failed')
    })

    it('should update updatedAt timestamp', () => {
      const jobId = jobService.createJob(1)
      const initialJob = jobService.getJob(jobId)
      const initialUpdatedAt = initialJob?.updatedAt

      // Advance time by 1 second
      vi.advanceTimersByTime(1000)

      jobService.updateJob(jobId, { status: 'running' })

      const updatedJob = jobService.getJob(jobId)
      expect(updatedJob?.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt?.getTime() ?? 0)
    })

    it('should do nothing for non-existent job', () => {
      expect(() => {
        jobService.updateJob('non-existent', { status: 'running' })
      }).not.toThrow()
    })

    it('should schedule TTL cleanup for completed job', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, { status: 'completed', result: { syncedCount: 5, errors: [] } })

      // Job should still exist immediately
      expect(jobService.getJob(jobId)).toBeDefined()

      // Advance time by 5 minutes (JOB_TTL)
      vi.advanceTimersByTime(5 * 60 * 1000)

      // Job should be cleaned up
      expect(jobService.getJob(jobId)).toBeUndefined()
    })

    it('should schedule TTL cleanup for failed job', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, { status: 'failed', error: 'Test error' })

      // Job should still exist immediately
      expect(jobService.getJob(jobId)).toBeDefined()

      // Advance time by 5 minutes (JOB_TTL)
      vi.advanceTimersByTime(5 * 60 * 1000)

      // Job should be cleaned up
      expect(jobService.getJob(jobId)).toBeUndefined()
    })
  })

  describe('TTL cleanup', () => {
    it('should not cleanup pending job after TTL', () => {
      const jobId = jobService.createJob(1)

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000)

      // Pending job should still exist
      expect(jobService.getJob(jobId)).toBeDefined()
    })

    it('should not cleanup running job after TTL', () => {
      const jobId = jobService.createJob(1)
      jobService.updateJob(jobId, { status: 'running' })

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000)

      // Running job should still exist
      expect(jobService.getJob(jobId)).toBeDefined()
    })
  })

  describe('concurrency protection', () => {
    it('should allow finding active job when multiple jobs exist', () => {
      const jobId1 = jobService.createJob(1)
      jobService.createJob(2)
      jobService.createJob(3)

      const activeJob = jobService.findActiveJobByAccountId(1)

      expect(activeJob?.id).toBe(jobId1)
    })

    it('should return first active job found for account', () => {
      // Create multiple jobs for same account
      jobService.createJob(1)
      jobService.createJob(1)

      // Should find one of them
      const activeJob = jobService.findActiveJobByAccountId(1)
      expect(activeJob).toBeDefined()
      expect(activeJob?.accountId).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('should handle zero accountId', () => {
      // This should work since accountId validation is not enforced at service level
      const jobId = jobService.createJob(0)
      const job = jobService.getJob(jobId)
      expect(job?.accountId).toBe(0)
    })

    it('should handle negative accountId', () => {
      const jobId = jobService.createJob(-1)
      const job = jobService.getJob(jobId)
      expect(job?.accountId).toBe(-1)
    })

    it('should preserve all fields on partial update', () => {
      const jobId = jobService.createJob(1)
      jobService.updateJob(jobId, { progress: 25 })

      jobService.updateJob(jobId, { status: 'running' })

      const job = jobService.getJob(jobId)
      expect(job?.progress).toBe(25)
      expect(job?.status).toBe('running')
    })

    it('should handle empty errors array in result', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, {
        status: 'completed',
        result: { syncedCount: 0, errors: [] }
      })

      const job = jobService.getJob(jobId)
      expect(job?.result?.errors).toEqual([])
    })

    it('should handle errors in result', () => {
      const jobId = jobService.createJob(1)

      jobService.updateJob(jobId, {
        status: 'completed',
        result: { syncedCount: 5, errors: ['Error 1', 'Error 2'] }
      })

      const job = jobService.getJob(jobId)
      expect(job?.result?.errors).toEqual(['Error 1', 'Error 2'])
    })
  })
})
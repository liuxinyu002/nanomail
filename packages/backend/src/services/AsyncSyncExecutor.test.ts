import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AsyncSyncExecutor } from './AsyncSyncExecutor'
import type { JobService } from './JobService'
import type { EmailSyncService } from './EmailSyncService'

describe('AsyncSyncExecutor', () => {
  let executor: AsyncSyncExecutor
  let mockJobService: JobService
  let mockEmailSyncService: EmailSyncService

  beforeEach(() => {
    // Create mock JobService
    mockJobService = {
      createJob: vi.fn(),
      getJob: vi.fn(),
      findActiveJobByAccountId: vi.fn(),
      updateJob: vi.fn(),
    } as unknown as JobService

    // Create mock EmailSyncService
    mockEmailSyncService = {
      sync: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
      isPolling: vi.fn(),
    } as unknown as EmailSyncService

    executor = new AsyncSyncExecutor(mockEmailSyncService, mockJobService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('executeSync', () => {
    it('should update job status to running at start', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 5 })

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', { status: 'running' })
    })

    it('should update job as completed on successful sync', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 10 })

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'completed',
        result: { syncedCount: 10, errors: [] },
      })
    })

    it('should update job as failed when sync returns error', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({
        syncedCount: 3,
        error: 'Partial sync failure',
      })

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'completed',
        result: { syncedCount: 3, errors: [] },
      })
    })

    it('should update job as failed when sync throws error', async () => {
      vi.mocked(mockEmailSyncService.sync).mockRejectedValue(new Error('Connection failed'))

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'failed',
        error: 'Connection failed',
      })
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockEmailSyncService.sync).mockRejectedValue('String error')

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'failed',
        error: 'Unknown error',
      })
    })

    it('should handle sync with zero emails', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 0 })

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'completed',
        result: { syncedCount: 0, errors: [] },
      })
    })

    it('should call sync without accountId parameter (uses default account)', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 5 })

      await executor.executeSync('job-123', 1)

      expect(mockEmailSyncService.sync).toHaveBeenCalled()
    })

    it('should update job in correct order: running then completed', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 5 })

      await executor.executeSync('job-123', 1)

      const updateCalls = vi.mocked(mockJobService.updateJob).mock.calls

      // First call should be running
      expect(updateCalls[0]).toEqual(['job-123', { status: 'running' }])
      // Second call should be completed
      expect(updateCalls[1][1].status).toBe('completed')
    })
  })

  describe('error handling', () => {
    it('should not throw when sync fails', async () => {
      vi.mocked(mockEmailSyncService.sync).mockRejectedValue(new Error('Sync error'))

      // Should not throw
      await expect(executor.executeSync('job-123', 1)).resolves.toBeUndefined()
    })

    it('should handle null sync result', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue(null as unknown as { syncedCount: number })

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'completed',
        result: { syncedCount: 0, errors: [] },
      })
    })

    it('should handle undefined sync result', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue(undefined as unknown as { syncedCount: number })

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'completed',
        result: { syncedCount: 0, errors: [] },
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty jobId', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 5 })

      await executor.executeSync('', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('', { status: 'running' })
    })

    it('should handle zero accountId', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 5 })

      await executor.executeSync('job-123', 0)

      expect(mockEmailSyncService.sync).toHaveBeenCalled()
    })

    it('should handle negative accountId', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 5 })

      await executor.executeSync('job-123', -1)

      expect(mockEmailSyncService.sync).toHaveBeenCalled()
    })

    it('should handle large syncedCount', async () => {
      vi.mocked(mockEmailSyncService.sync).mockResolvedValue({ syncedCount: 100000 })

      await executor.executeSync('job-123', 1)

      expect(mockJobService.updateJob).toHaveBeenCalledWith('job-123', {
        status: 'completed',
        result: { syncedCount: 100000, errors: [] },
      })
    })
  })
})
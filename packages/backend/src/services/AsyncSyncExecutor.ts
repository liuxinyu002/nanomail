import type { EmailSyncService } from './EmailSyncService'
import type { JobService } from './JobService'
import { createLogger, type Logger } from '../config/logger.js'

/**
 * AsyncSyncExecutor - Executes email sync operations asynchronously
 *
 * Coordinates between JobService and EmailSyncService:
 * 1. Updates job status to 'running'
 * 2. Executes sync operation
 * 3. Updates job status to 'completed' or 'failed'
 */
export class AsyncSyncExecutor {
  private readonly log: Logger

  constructor(
    private readonly emailSyncService: EmailSyncService,
    private readonly jobService: JobService
  ) {
    this.log = createLogger('AsyncSyncExecutor')
  }

  /**
   * Execute a sync operation asynchronously
   * Updates job status throughout the lifecycle
   *
   * @param jobId - The job ID to update
   * @param accountId - The account ID (currently unused, for future multi-account support)
   */
  async executeSync(jobId: string, accountId: number): Promise<void> {
    this.log.info({ jobId, accountId }, 'Starting async sync execution')

    // Update status to running
    this.jobService.updateJob(jobId, { status: 'running' })

    try {
      // Execute sync
      const result = await this.emailSyncService.sync()

      const syncedCount = result?.syncedCount ?? 0

      // Update status to completed
      this.jobService.updateJob(jobId, {
        status: 'completed',
        result: {
          syncedCount,
          errors: [],
        },
      })

      this.log.info({ jobId, syncedCount }, 'Sync completed successfully')

    } catch (error) {
      // Update status to failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      this.jobService.updateJob(jobId, {
        status: 'failed',
        error: errorMessage,
      })

      this.log.error({ jobId, err: error }, 'Sync failed')
    }
  }
}
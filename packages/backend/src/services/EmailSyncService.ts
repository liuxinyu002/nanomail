import type { DataSource, Repository } from 'typeorm'
import { QueryFailedError } from 'typeorm'
import cron from 'node-cron'
import { Email } from '../entities/Email.entity'
import type { SettingsService } from './SettingsService'
import { MailFetcherFactory } from './MailFetcherFactory'
import type { FetchedEmail } from './types/mail-fetcher.types'
import { hasUidField } from './types/mail-fetcher.types'
import type { MailParserService } from './MailParserService'
import { createLogger, type Logger } from '../config/logger.js'

/**
 * EmailSyncService - Email Synchronization Service
 *
 * Refactored to use Factory pattern:
 * 1. Use Factory to get protocol adapter
 * 2. Streaming consumption (for await...of)
 * 3. Fetch one, save one
 * 4. Resume from breakpoint (single email failure doesn't affect overall)
 */
export class EmailSyncService {
  private readonly log: Logger
  private emailRepository: Repository<Email>
  private cronTask: ReturnType<typeof cron.schedule> | null = null
  private pollingActive = false
  private isSyncing = false  // Mutex lock
  private factory: MailFetcherFactory

  constructor(
    private readonly _dataSource: DataSource,
    private readonly settingsService: SettingsService,
    private readonly mailParserService: MailParserService
  ) {
    this.emailRepository = _dataSource.getRepository(Email)
    // Factory injects Repository for Pop3Service use
    this.factory = new MailFetcherFactory(settingsService, this.emailRepository)
    this.log = createLogger('EmailSyncService')
  }

  /**
   * Performs a one-time sync of emails using streaming.
   *
   * Core process:
   * 1. Check mutex lock, prevent concurrency
   * 2. Get adapter based on PROTOCOL_TYPE
   * 3. Stream consume emails, save one by one
   * 4. Update sync progress
   */
  async sync(): Promise<{ syncedCount: number; error?: string }> {
    // Mutex check
    if (this.isSyncing) {
      return { syncedCount: 0, error: 'Sync already in progress' }
    }

    this.isSyncing = true
    let syncedCount = 0

    try {
      // Get adapter
      const fetcher = await this.factory.getFetcher()

      // Stream consume (no need to pass Repository, already injected at construction)
      for await (const email of fetcher.fetchNewEmails()) {
        try {
          // Save one
          await this.saveEmail(email)
          syncedCount++

          // Update sync progress (IMAP needs, POP3 just logs time)
          await this.updateSyncProgress(email)

        } catch (dbError) {
          // Database exception: interrupt sync, preserve state
          this.log.error({ err: dbError }, 'Database error, stopping sync')
          throw dbError
        }
      }

      // Sync complete, update POP3 sync time (if applicable)
      if (fetcher.protocolType === 'POP3') {
        await this.settingsService.set(
          'LAST_POP3_SYNC_TIME',
          new Date().toISOString()
        )
      }

      return { syncedCount }

    } catch (error) {
      this.log.error({ err: error }, 'Sync failed')
      return {
        syncedCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Save email to database
   *
   * Uses insert() with exception handling for idempotent inserts:
   * - If message_id already exists, UNIQUE constraint error is caught and ignored
   * - No "check-then-insert" race condition
   * - No N+1 query performance issue
   */
  private async saveEmail(email: FetchedEmail): Promise<void> {
    // Parse raw content for text
    const parsed = await this.mailParserService.parse(email.rawContent)
    const textContent = this.mailParserService.extractText(parsed)
    const snippet = this.mailParserService.createSnippet(textContent)

    const entity = this.emailRepository.create({
      subject: email.subject,
      sender: email.from,
      snippet: snippet,
      bodyText: textContent,
      date: email.date,
      hasAttachments: email.hasAttachments,
      isProcessed: false,
      process_status: 'PENDING',
      // Protocol identifier (union type ensures only one is assigned)
      uid: hasUidField(email) ? email.uid : null,
      uidl: 'uidl' in email ? email.uidl : null,
      // Thread context
      message_id: email.messageId,
      in_reply_to: email.inReplyTo,
      references: email.references,
    })

    try {
      await this.emailRepository.insert(entity)
    } catch (error) {
      // Check if it's a UNIQUE constraint violation (duplicate message_id)
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as { code?: string; message?: string }
        // SQLite: code 19 = SQLITE_CONSTRAINT
        // PostgreSQL: code '23505' = unique_violation
        if (
          driverError.code === 'SQLITE_CONSTRAINT' ||
          driverError.code === '19' ||
          driverError.code === '23505' ||
          driverError.message?.includes('UNIQUE constraint failed')
        ) {
          this.log.debug({ messageId: email.messageId }, 'Email already exists, insert ignored')
          return
        }
      }
      // Re-throw unexpected errors
      throw error
    }
  }

  /**
   * Update sync progress
   */
  private async updateSyncProgress(email: FetchedEmail): Promise<void> {
    if (hasUidField(email) && email.uid) {
      // IMAP: update LAST_IMAP_SYNCED_UID
      await this.settingsService.set('LAST_IMAP_SYNCED_UID', String(email.uid))
    }
    // POP3: no need to update cursor, Diff mechanism handles automatically
  }

  /**
   * Starts the background polling for emails.
   *
   * @param intervalMinutes - Polling interval in minutes (default: 5)
   */
  startPolling(intervalMinutes: number = 5): void {
    // Prevent duplicate polling
    if (this.pollingActive) {
      return
    }

    // Create cron expression: every N minutes
    const cronExpression = `*/${intervalMinutes} * * * *`

    // Start the cron job
    this.cronTask = cron.schedule(cronExpression, async () => {
      await this.sync()
    })

    this.pollingActive = true
  }

  /**
   * Stops the background polling.
   */
  stopPolling(): void {
    if (this.cronTask) {
      this.cronTask.stop()
      this.cronTask = null
    }
    this.pollingActive = false
  }

  /**
   * Checks if polling is currently active.
   */
  isPolling(): boolean {
    return this.pollingActive
  }
}
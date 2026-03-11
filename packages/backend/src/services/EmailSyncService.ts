import type { DataSource, Repository } from 'typeorm'
import cron from 'node-cron'
import { Email } from '../entities/Email.entity'
import type { ImapService } from './ImapService'
import type { MailParserService } from './MailParserService'

/**
 * Sync result containing statistics about the sync operation
 */
export interface SyncResult {
  success: boolean
  emailsFetched: number
  emailsSaved: number
  errors: string[]
}

/**
 * EmailSyncService provides background email synchronization.
 *
 * Responsibilities:
 * - Poll IMAP server for unseen emails at configured intervals
 * - Parse and store emails in the database
 * - Handle errors gracefully without crashing
 */
export class EmailSyncService {
  private emailRepository: Repository<Email>
  private cronTask: ReturnType<typeof cron.schedule> | null = null
  private pollingActive = false

  constructor(
    dataSource: DataSource,
    private readonly imapService: ImapService,
    private readonly mailParserService: MailParserService
  ) {
    this.emailRepository = dataSource.getRepository(Email)
  }

  /**
   * Performs a one-time sync of unseen emails.
   *
   * @param limit - Maximum number of emails to fetch (default: 10)
   * @returns SyncResult with sync statistics
   */
  async syncEmails(limit: number = 10): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      emailsFetched: 0,
      emailsSaved: 0,
      errors: [],
    }

    try {
      // Fetch unseen emails from IMAP
      const fetchedEmails = await this.imapService.fetchUnseen(limit)
      result.emailsFetched = fetchedEmails.length

      // Process each email
      for (const fetchedEmail of fetchedEmails) {
        try {
          // Parse the raw email content
          const parsed = await this.mailParserService.parse(fetchedEmail.rawContent)

          // Extract text content
          const textContent = this.mailParserService.extractText(parsed)
          const snippet = this.mailParserService.createSnippet(textContent)

          // Create email entity
          const email = this.emailRepository.create({
            subject: parsed.subject ?? fetchedEmail.subject,
            sender: parsed.from ?? fetchedEmail.from,
            snippet: snippet,
            bodyText: textContent,
            hasAttachments: fetchedEmail.hasAttachments || parsed.hasAttachments,
            date: parsed.date ?? fetchedEmail.date,
            isProcessed: false,
            isSpam: false,
          })

          // Save to database
          await this.emailRepository.save(email)
          result.emailsSaved++
        } catch (error) {
          result.errors.push(
            `Failed to process email UID ${fetchedEmail.uid}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error')
    }

    return result
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
      await this.syncEmails()
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
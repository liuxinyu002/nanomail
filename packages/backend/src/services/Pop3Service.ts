import POP3 from 'node-pop3'
import type { Repository } from 'typeorm'
import type { SettingsService } from './SettingsService'
import type { IMailFetcher, ConnectionTestResult } from './interfaces/IMailFetcher.interface'
import type { FetchedEmail, EmailIdentifier } from './types/mail-fetcher.types'
import { hasUidl } from './types/mail-fetcher.types'
import { MailParserService } from './MailParserService'
import { Email } from '../entities/Email.entity'
import { createLogger, type Logger } from '../config/logger.js'

/**
 * POP3 configuration
 */
interface Pop3Config {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
}

/**
 * UIDL list item
 */
interface UidlItem {
  seq: number      // POP3 sequence number
  uidl: string     // Server unique identifier
}

/**
 * POP3 Adapter implementing IMailFetcher
 *
 * Features:
 * - UIDL full fetch + local diff for incremental sync
 * - Reverse sync (newest emails first)
 * - Batch diff (Batch Size: 1000)
 * - RETR serial streaming download
 * - Single email error tolerance
 *
 * Architecture:
 * - Repository<Email> injected via constructor for local diff queries
 */
export class Pop3Service implements IMailFetcher {
  readonly protocolType = 'POP3' as const

  private readonly log: Logger = createLogger('Pop3Service')
  private pop3: POP3 | null = null
  private configCache: Pop3Config | null = null
  private readonly mailParser = new MailParserService()

  // Batch size constant
  private readonly BATCH_SIZE = 1000

  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailRepository: Repository<Email>
  ) {}

  /**
   * Get POP3 configuration (with caching)
   */
  private async getConfig(): Promise<Pop3Config> {
    if (this.configCache) return this.configCache

    const host = await this.settingsService.get('POP3_HOST')
    const portStr = await this.settingsService.get('POP3_PORT')
    const user = await this.settingsService.get('POP3_USER')
    const password = await this.settingsService.get('POP3_PASS')

    if (!host || !user || !password) {
      throw new Error('POP3 configuration is incomplete')
    }

    this.configCache = {
      host,
      port: portStr ? parseInt(portStr, 10) : 995,
      user,
      password,
      tls: true,
    }

    return this.configCache
  }

  /**
   * Get POP3 client instance
   *
   * Note: node-pop3 extends EventEmitter and emits 'error' and 'warn' events.
   * We must attach listeners to prevent unhandled errors from crashing the process.
   */
  private async getPop3Client(): Promise<POP3> {
    if (this.pop3) return this.pop3

    const config = await this.getConfig()
    this.pop3 = new POP3({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      tls: config.tls,
    })

    // Attach error listener to prevent unhandled errors
    // The 'error' event is emitted when socket errors occur
    this.pop3.on('error', (err: Error & { eventName?: string; code?: string }) => {
      // Handle expected socket close events gracefully
      if (
        err.code === 'EPIPE' ||
        err.message?.includes('socket has been ended') ||
        err.message === 'end' ||
        err.message === 'close'
      ) {
        this.log.debug({ eventName: err.eventName }, 'POP3 socket closed by server')
      } else {
        this.log.error({ err, eventName: err.eventName }, 'POP3 socket error')
      }
      // Reset the client so a fresh connection is created on next use
      this.pop3 = null
    })

    // Attach warn listener for non-fatal warnings
    this.pop3.on('warn', (err: Error & { eventName?: string; code?: string }) => {
      // Handle expected socket close events gracefully
      if (
        err.code === 'EPIPE' ||
        err.message?.includes('socket has been ended') ||
        err.message === 'end' ||
        err.message === 'close'
      ) {
        this.log.debug({ eventName: err.eventName }, 'POP3 socket event')
      } else {
        this.log.warn({ err }, 'POP3 warning')
      }
    })

    return this.pop3
  }

  /**
   * Establish connection to the POP3 server
   */
  async connect(): Promise<void> {
    // POP3 connection is established on demand
    await this.getPop3Client()
  }

  /**
   * Disconnect from the POP3 server
   *
   * POP3 servers often close connections aggressively after data transfer,
   * which can cause EPIPE errors when we try to send QUIT.
   * These are expected and should be handled gracefully.
   */
  async disconnect(): Promise<void> {
    if (!this.pop3) return

    const client = this.pop3
    this.pop3 = null

    try {
      await client.QUIT()
    } catch (error: unknown) {
      // Handle expected socket close errors gracefully
      const err = error as Error & { code?: string; eventName?: string }
      if (
        err.code === 'EPIPE' ||
        err.message?.includes('socket has been ended') ||
        err.message === 'end' ||
        err.message === 'close'
      ) {
        // Normal POP3 server behavior - connection already closed by server
        this.log.debug('POP3 server closed connection (expected behavior)')
      } else {
        // Unexpected error during disconnect
        this.log.warn({ err: error }, 'POP3 disconnect error')
      }
    }
  }

  /**
   * Test server connection
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const config = await this.getConfig()
      const testPop3 = new POP3({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        tls: config.tls,
      })

      // Attach error listener to prevent unhandled errors
      testPop3.on('error', () => {
        // Error will be caught by the try-catch
      })

      // Try to list emails to verify connection
      await testPop3.LIST()
      await testPop3.QUIT()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
      }
    }
  }

  /**
   * Fetch server UIDL list (reverse order, newest first)
   */
  private async fetchUidlList(): Promise<UidlItem[]> {
    const pop3 = await this.getPop3Client()

    // Execute UIDL command to get full list
    // node-pop3 listify() returns: [["1", "uidl-1"], ["2", "uidl-2"], ...]
    const uidlArray = await pop3.UIDL()

    // Handle both array and object formats (defensive)
    let uidlEntries: [string, string][]
    if (Array.isArray(uidlArray)) {
      // Expected format: [["1", "uidl-1"], ["2", "uidl-2"]]
      uidlEntries = uidlArray.map((item) => {
        if (Array.isArray(item)) {
          return [String(item[0] ?? ''), String(item[1] ?? '')]
        }
        // Fallback for unexpected format
        return ['', '']
      }) as [string, string][]
    } else if (typeof uidlArray === 'object' && uidlArray !== null) {
      // Fallback: object format { "1": "uidl-1", "2": "uidl-2" }
      uidlEntries = Object.entries(uidlArray)
    } else {
      uidlEntries = []
    }

    // Convert to array and reverse (newest emails first)
    const uidlList: UidlItem[] = uidlEntries
      .filter(([seq]) => seq && parseInt(seq, 10) > 0) // Filter valid sequence numbers
      .map(([seq, uidl]) => ({
        seq: parseInt(seq, 10),
        uidl: typeof uidl === 'string' ? uidl : String(uidl),
      }))
      .reverse() // Key: reverse order, newest emails first

    return uidlList
  }

  /**
   * Local diff query: filter out UIDLs that need to be downloaded
   *
   * Process:
   * 1. Split UIDL list by BATCH_SIZE
   * 2. Query local database for existing uidl in each batch
   * 3. Calculate difference, return UIDLs that need downloading
   */
  private async diffWithLocal(uidlList: UidlItem[]): Promise<UidlItem[]> {
    const newUidlItems: UidlItem[] = []

    // Batch processing
    for (let i = 0; i < uidlList.length; i += this.BATCH_SIZE) {
      const batch = uidlList.slice(i, i + this.BATCH_SIZE)
      const batchUidls = batch.map(item => item.uidl)

      // Query existing uidl in this batch
      const existingRecords = await this.emailRepository
        .createQueryBuilder('email')
        .select('email.uidl')
        .where('email.uidl IN (:...uidls)', { uidls: batchUidls })
        .getMany()

      const existingUidls = new Set(existingRecords.map(r => r.uidl))

      // Calculate difference
      const newInBatch = batch.filter(item => !existingUidls.has(item.uidl))
      newUidlItems.push(...newInBatch)
    }

    return newUidlItems
  }

  /**
   * Fetch new emails (streaming)
   *
   * Implementation:
   * 1. UIDL full fetch + reverse order
   * 2. Batch diff to filter new emails
   * 3. RETR serial download -> parse -> yield
   * 4. Single email failures are logged and continue
   * 5. Socket errors are caught and handled gracefully
   */
  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    await this.connect()
    this.log.info('POP3 server connected')

    let fetchCount = 0

    try {
      // Step 1: Get UIDL list (reverse order)
      const uidlList = await this.fetchUidlList()

      if (uidlList.length === 0) {
        return
      }

      // Step 2: Local diff to filter new emails
      const newUidlItems = await this.diffWithLocal(uidlList)

      if (newUidlItems.length === 0) {
        return
      }

      this.log.info({ count: newUidlItems.length }, 'Found new emails to fetch')

      // Step 3: Serial download (streaming)
      const pop3 = await this.getPop3Client()

      for (const item of newUidlItems) {
        try {
          // Execute RETR command to download raw email
          const rawContent = await pop3.RETR(item.seq)

          // Parse MIME content
          const parsed = await this.mailParser.parse(rawContent)

          // Assemble and yield (union type: POP3 must have uidl)
          const email: FetchedEmail = {
            uidl: item.uidl,  // POP3 required
            subject: parsed.subject,
            from: parsed.from,
            date: parsed.date ?? new Date(),
            rawContent: rawContent,
            hasAttachments: parsed.hasAttachments,
            messageId: parsed.messageId,
            inReplyTo: parsed.inReplyTo,
            references: parsed.references,
          }

          fetchCount++
          yield email

        } catch (error) {
          // Single email error: log and continue
          this.log.error({ err: error, uidl: item.uidl }, 'Failed to fetch email')
          continue
        }
      }

      this.log.info({ count: fetchCount }, 'Fetched emails from POP3')

    } catch (error) {
      // Socket or connection error: log and re-throw
      this.log.error({ err: error }, 'POP3 connection error during fetch')
      throw error
    } finally {
      // Clean up connection after fetch completes or errors
      await this.disconnect()
    }
  }

  /**
   * Mark as read - POP3 not supported, gracefully degrades to no-op
   */
  async markAsRead(_identifier: EmailIdentifier): Promise<void> {
    // POP3 protocol does not support server-side state management
    // Graceful degradation: return directly, no exception thrown
    // Upper layer can still update local database status
    return Promise.resolve()
  }

  /**
   * Move to folder - POP3 not supported, gracefully degrades to no-op
   */
  async moveToFolder(_identifier: EmailIdentifier, _folder: string): Promise<void> {
    // POP3 protocol does not support folder concept
    // Graceful degradation: return directly
    return Promise.resolve()
  }

  /**
   * Delete email - POP3 supports DELE command
   *
   * Transaction note:
   * Per POP3 protocol, DELE only marks email as "logically deleted",
   * server only performs physical deletion after receiving QUIT command
   * and entering UPDATE state. Therefore must explicitly call QUIT after DELE,
   * otherwise deletion will be lost on network disconnect.
   */
  async deleteMessage(identifier: EmailIdentifier): Promise<void> {
    if (!hasUidl(identifier)) {
      throw new Error('POP3 requires uidl for deleteMessage')
    }

    const pop3 = await this.getPop3Client()

    // Need to find sequence number via UIDL
    const uidlList = await this.fetchUidlList()
    const item = uidlList.find(i => i.uidl === identifier.uidl)

    if (!item) {
      throw new Error(`Email with uidl=${identifier.uidl} not found`)
    }

    // Execute DELE command (mark for deletion)
    await pop3.DELE(item.seq)

    // Critical: explicitly call QUIT to commit deletion
    // Per POP3 protocol, only QUIT entering UPDATE state commits deletion
    await pop3.QUIT()

    // Reset client after QUIT
    this.pop3 = null
  }
}
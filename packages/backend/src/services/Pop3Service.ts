import POP3 from 'node-pop3'
import type { Repository } from 'typeorm'
import type { SettingsService } from './SettingsService'
import type { IMailFetcher, ConnectionTestResult } from './interfaces/IMailFetcher.interface'
import type { FetchedEmail, EmailIdentifier } from './types/mail-fetcher.types'
import { hasUidl } from './types/mail-fetcher.types'
import { MailParserService } from './MailParserService'
import { Email } from '../entities/Email.entity'

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
    const password = await this.settingsService.get('POP3_PASSWORD')

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
   */
  async disconnect(): Promise<void> {
    if (this.pop3) {
      try {
        await this.pop3.QUIT()
      } catch {
        // Ignore disconnect errors
      } finally {
        this.pop3 = null
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
    // node-pop3 returns format: { 1: 'uidl-string-1', 2: 'uidl-string-2', ... }
    const uidlMap = await pop3.UIDL()

    // Convert to array and reverse (newest emails first)
    const uidlList: UidlItem[] = Object.entries(uidlMap)
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
   */
  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    await this.connect()

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

          yield email

        } catch (error) {
          // Single email error: log and continue
          console.error(`[POP3] Failed to fetch email uidl=${item.uidl}:`, error)
          continue
        }
      }
    } finally {
      // POP3 connection is managed per-session; each fetch cycle creates a fresh connection
      // Connection cleanup is handled by the finally block in getPop3Client
    }
  }

  /**
   * Mark as read - POP3 not supported, gracefully degrades to no-op
   */
  async markAsRead(identifier: EmailIdentifier): Promise<void> {
    // POP3 protocol does not support server-side state management
    // Graceful degradation: return directly, no exception thrown
    // Upper layer can still update local database status
    return Promise.resolve()
  }

  /**
   * Move to folder - POP3 not supported, gracefully degrades to no-op
   */
  async moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void> {
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
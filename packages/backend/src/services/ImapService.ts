import { ImapFlow, type ImapFlowOptions } from 'imapflow'
import type { SettingsService } from './SettingsService'
import type { IMailFetcher, ConnectionTestResult } from './interfaces/IMailFetcher.interface'
import type { FetchedEmail, EmailIdentifier } from './types/mail-fetcher.types'
import { hasUid } from './types/mail-fetcher.types'
import { MailParserService } from './MailParserService'
import { createLogger, type Logger } from '../config/logger.js'

/**
 * IMAP configuration retrieved from SettingsService
 */
export interface ImapConfig {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
}

/**
 * Setting keys required for IMAP configuration
 */
const IMAP_SETTINGS = {
  HOST: 'IMAP_HOST',
  PORT: 'IMAP_PORT',
  USER: 'IMAP_USER',
  PASSWORD: 'IMAP_PASSWORD',
  LAST_SYNCED_UID: 'LAST_IMAP_SYNCED_UID',
} as const

/**
 * ImapService - IMAP Adapter implementing IMailFetcher
 *
 * Responsibilities:
 * - Connect to IMAP server using encrypted credentials from SettingsService
 * - Fetch emails using streaming AsyncGenerator
 * - Provide raw email content for parsing
 *
 * Connection Pooling:
 * - Uses singleton pattern for client instance
 * - Credentials are decrypted only once
 * - Client is reused across requests
 */
export class ImapService implements IMailFetcher {
  readonly protocolType = 'IMAP' as const

  private readonly log: Logger = createLogger('ImapService')
  private client: ImapFlow | null = null
  private configCache: ImapConfig | null = null
  private readonly mailParser = new MailParserService()

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Retrieves IMAP configuration from settings.
   * Cached after first retrieval to avoid repeated decryption.
   */
  async getConfig(): Promise<ImapConfig> {
    if (this.configCache) {
      return this.configCache
    }

    const host = await this.settingsService.get(IMAP_SETTINGS.HOST)
    const portStr = await this.settingsService.get(IMAP_SETTINGS.PORT)
    const user = await this.settingsService.get(IMAP_SETTINGS.USER)
    const password = await this.settingsService.get(IMAP_SETTINGS.PASSWORD)

    if (!host) {
      throw new Error('IMAP_HOST is not configured')
    }

    if (!user) {
      throw new Error('IMAP_USER is not configured')
    }

    if (!password) {
      throw new Error('IMAP_PASSWORD is not configured')
    }

    this.configCache = {
      host,
      port: portStr ? parseInt(portStr, 10) : 993,
      user,
      password,
      tls: true,
    }

    return this.configCache
  }

  /**
   * Gets or creates a cached IMAP client instance (singleton pattern).
   */
  async getClient(): Promise<ImapFlow> {
    if (this.client) {
      return this.client
    }

    const config = await this.getConfig()
    this.client = this.createClient(config)

    return this.client
  }

  /**
   * Resets the singleton instance (useful for testing or credential changes).
   */
  resetInstance(): void {
    this.client = null
    this.configCache = null
  }

  /**
   * Creates an ImapFlow client with the given configuration.
   */
  private createClient(config: ImapConfig): ImapFlow {
    const options: ImapFlowOptions = {
      host: config.host,
      port: config.port,
      auth: {
        user: config.user,
        pass: config.password,
      },
      secure: config.tls,
      logger: false,
    }

    return new ImapFlow(options)
  }

  /**
   * Establish connection to the IMAP server.
   */
  async connect(): Promise<void> {
    const client = await this.getClient()
    await client.connect()
  }

  /**
   * Disconnect from the IMAP server.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.logout()
      } catch {
        // Ignore logout errors
      } finally {
        this.client = null
      }
    }
  }

  /**
   * Tests connection to IMAP server.
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const config = await this.getConfig()
      const client = this.createClient(config)

      await client.connect()
      await client.logout()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
      }
    }
  }

  /**
   * Fetch new emails (streaming with AsyncGenerator)
   *
   * Design points:
   * - Uses imapflow native fetch async iterator for true streaming
   * - Based on LAST_IMAP_SYNCED_UID for incremental sync
   * - Single email failures are logged and continue
   */
  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    const client = await this.getClient()

    try {
      await client.connect()
      await client.mailboxOpen('INBOX')

      // Get last synced UID for incremental sync
      const lastUidStr = await this.settingsService.get(IMAP_SETTINGS.LAST_SYNCED_UID)
      const startUid = lastUidStr ? parseInt(lastUidStr, 10) + 1 : 1

      // Build UID range query
      const fetchRange = `${startUid}:*`

      // Use imapflow native fetch async iterator (true streaming)
      const fetchStream = client.fetch(fetchRange, {
        uid: true,
        source: true,
        envelope: true,
        bodyStructure: true,
      })

      // Stream consumption
      for await (const message of fetchStream) {
        try {
          if (!message.uid || !message.source) {
            continue
          }

          // Parse MIME content
          const parsed = await this.mailParser.parse(message.source)

          // Assemble and yield (union type: IMAP must have uid)
          const email: FetchedEmail = {
            uid: message.uid,
            subject: parsed.subject ?? message.envelope?.subject ?? null,
            from: parsed.from ?? message.envelope?.from?.[0]?.address ?? null,
            date: parsed.date ?? message.envelope?.date ?? new Date(),
            rawContent: message.source.toString(),
            hasAttachments: parsed.hasAttachments || this.checkForAttachments(message.bodyStructure),
            messageId: parsed.messageId,
            inReplyTo: parsed.inReplyTo,
            references: parsed.references,
          }

          yield email

        } catch (error) {
          // Single email error: log and continue
          this.log.error({ err: error, uid: message.uid }, 'Failed to process email')
          continue
        }
      }

    } finally {
      // Connection pooling: keep the IMAP client alive for reuse
      // The sync engine or caller is responsible for calling disconnect() when done
    }
  }

  /**
   * Mark email as read (IMAP supported)
   */
  async markAsRead(identifier: EmailIdentifier): Promise<void> {
    if (!hasUid(identifier)) {
      throw new Error('IMAP requires uid for markAsRead')
    }

    const client = await this.getClient()
    await client.messageFlagsAdd({ uid: identifier.uid }, ['\\Seen'])
  }

  /**
   * Move email to specified folder (IMAP supported)
   */
  async moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void> {
    if (!hasUid(identifier)) {
      throw new Error('IMAP requires uid for moveToFolder')
    }

    const client = await this.getClient()
    await client.messageMove({ uid: identifier.uid }, folder)
  }

  /**
   * Delete email (IMAP supported)
   */
  async deleteMessage(identifier: EmailIdentifier): Promise<void> {
    if (!hasUid(identifier)) {
      throw new Error('IMAP requires uid for deleteMessage')
    }

    const client = await this.getClient()
    await client.messageFlagsAdd({ uid: identifier.uid }, ['\\Deleted'])
    await client.expunge()
  }

  /**
   * Checks if the body structure contains attachments.
   */
  private checkForAttachments(bodyStructure: unknown): boolean {
    if (!bodyStructure || typeof bodyStructure !== 'object') {
      return false
    }

    const structure = bodyStructure as Record<string, unknown>

    if (structure.disposition === 'attachment') {
      return true
    }

    if (Array.isArray(structure.childNodes)) {
      return structure.childNodes.some((child) => this.checkForAttachments(child))
    }

    return false
  }
}
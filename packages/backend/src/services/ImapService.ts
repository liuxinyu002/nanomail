import { ImapFlow, type ImapFlowOptions } from 'imapflow'
import type { SettingsService } from './SettingsService'

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
 * Result of IMAP connection test
 */
export interface ImapConnectionResult {
  success: boolean
  error?: string
}

/**
 * Fetched email data from IMAP
 */
export interface FetchedEmail {
  uid: number
  subject: string | null
  from: string | null
  date: Date
  rawContent: string
  hasAttachments: boolean
}

/**
 * Setting keys required for IMAP configuration
 */
const IMAP_SETTINGS = {
  HOST: 'IMAP_HOST',
  PORT: 'IMAP_PORT',
  USER: 'IMAP_USER',
  PASSWORD: 'IMAP_PASSWORD',
} as const

/**
 * ImapService provides email fetching capabilities using imapflow.
 *
 * Responsibilities:
 * - Connect to IMAP server using encrypted credentials from SettingsService
 * - Fetch unseen emails
 * - Provide raw email content for parsing
 */
export class ImapService {
  private client: ImapFlow | null = null

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Retrieves IMAP configuration from settings.
   *
   * @returns ImapConfig object with decrypted credentials
   * @throws Error if any required setting is missing
   */
  async getConfig(): Promise<ImapConfig> {
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

    return {
      host,
      port: portStr ? parseInt(portStr, 10) : 993,
      user,
      password,
      tls: true,
    }
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
   * Tests connection to IMAP server.
   *
   * @returns ImapConnectionResult indicating success or failure
   */
  async testConnection(): Promise<ImapConnectionResult> {
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
   * Fetches unseen emails from the inbox.
   *
   * @param limit - Maximum number of emails to fetch (default: 10)
   * @returns Array of FetchedEmail objects
   */
  async fetchUnseen(limit: number = 10): Promise<FetchedEmail[]> {
    const config = await this.getConfig()
    this.client = this.createClient(config)

    try {
      await this.client.connect()

      // Select inbox
      await this.client.mailboxOpen('INBOX')

      // Search for unseen messages
      const uids = await this.client.search({ seen: false })

      if (!uids || !Array.isArray(uids) || uids.length === 0) {
        return []
      }

      // Limit the number of emails to fetch
      const limitedUids = uids.slice(0, limit)

      // Fetch messages
      const messages = await this.client.fetchAll(limitedUids, {
        uid: true,
        envelope: true,
        source: true,
        bodyStructure: true,
      })

      const emails: FetchedEmail[] = []

      for (const msg of messages) {
        if (!msg.uid || !msg.source) continue

        // Check for attachments in body structure
        const hasAttachments = this.checkForAttachments(msg.bodyStructure)

        emails.push({
          uid: msg.uid,
          subject: msg.envelope?.subject ?? null,
          from: msg.envelope?.from?.[0]?.address ?? null,
          date: msg.envelope?.date ?? new Date(),
          rawContent: msg.source.toString(),
          hasAttachments,
        })
      }

      return emails
    } finally {
      await this.close()
    }
  }

  /**
   * Checks if the body structure contains attachments.
   */
  private checkForAttachments(bodyStructure: unknown): boolean {
    if (!bodyStructure || typeof bodyStructure !== 'object') {
      return false
    }

    const structure = bodyStructure as Record<string, unknown>

    // Check if this node is an attachment
    if (structure.disposition === 'attachment') {
      return true
    }

    // Check child nodes recursively
    if (Array.isArray(structure.childNodes)) {
      return structure.childNodes.some((child) => this.checkForAttachments(child))
    }

    return false
  }

  /**
   * Closes the IMAP connection.
   */
  async close(): Promise<void> {
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
}
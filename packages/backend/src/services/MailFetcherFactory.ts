import type { Repository } from 'typeorm'
import type { SettingsService } from './SettingsService'
import type { IMailFetcher } from './interfaces/IMailFetcher.interface'
import { ImapService } from './ImapService'
import { Pop3Service } from './Pop3Service'
import { Email } from '../entities/Email.entity'

/**
 * Mail Fetcher Factory
 *
 * Responsibility: Dynamically instantiate the corresponding adapter based on PROTOCOL_TYPE configuration
 *
 * Architecture:
 * - Pop3Service needs Repository<Email> injected for local diff queries
 * - Repository injected via constructor, keeping IMailFetcher interface pure
 */
export class MailFetcherFactory {
  private imapInstance: ImapService | null = null
  private pop3Instance: Pop3Service | null = null

  constructor(
    private readonly settingsService: SettingsService,
    private readonly emailRepository: Repository<Email>
  ) {}

  /**
   * Get mail fetcher instance
   *
   * @returns IMailFetcher implementation
   * @throws Error if configuration is invalid
   */
  async getFetcher(): Promise<IMailFetcher> {
    const protocolType = await this.settingsService.get('PROTOCOL_TYPE')

    switch (protocolType) {
      case 'IMAP':
        // Singleton cache
        if (!this.imapInstance) {
          this.imapInstance = new ImapService(this.settingsService)
        }
        return this.imapInstance

      case 'POP3':
        // Singleton cache, inject Repository
        if (!this.pop3Instance) {
          this.pop3Instance = new Pop3Service(
            this.settingsService,
            this.emailRepository
          )
        }
        return this.pop3Instance

      default:
        // Default to IMAP (compatibility with existing configuration)
        if (!this.imapInstance) {
          this.imapInstance = new ImapService(this.settingsService)
        }
        return this.imapInstance
    }
  }

  /**
   * Reset all instances (call when configuration changes)
   */
  reset(): void {
    this.imapInstance = null
    this.pop3Instance = null
  }
}
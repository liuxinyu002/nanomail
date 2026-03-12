import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailSyncService } from './EmailSyncService'
import type { DataSource, Repository } from 'typeorm'
import type { Email } from '../entities/Email.entity'
import type { SettingsService } from './SettingsService'
import type { MailParserService } from './MailParserService'
import type { IMailFetcher } from './interfaces/IMailFetcher.interface'
import type { FetchedEmail } from './types/mail-fetcher.types'

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(() => ({ stop: vi.fn() })),
  },
}))

// Mock MailFetcherFactory
vi.mock('./MailFetcherFactory', () => ({
  MailFetcherFactory: vi.fn().mockImplementation(() => ({
    getFetcher: vi.fn(),
    reset: vi.fn(),
  })),
}))

describe('EmailSyncService', () => {
  let service: EmailSyncService
  let mockDataSource: DataSource
  let mockRepository: Repository<Email>
  let mockSettingsService: SettingsService
  let mockMailParserService: MailParserService
  let mockFetcher: IMailFetcher

  beforeEach(async () => {
    // Create mock repository
    mockRepository = {
      save: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      createQueryBuilder: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      }),
    } as unknown as Repository<Email>

    // Create mock data source
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
      isInitialized: true,
    } as unknown as DataSource

    // Create mock settings service
    mockSettingsService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as SettingsService

    // Create mock mail parser service
    mockMailParserService = {
      parse: vi.fn(),
      extractText: vi.fn(),
      createSnippet: vi.fn(),
    } as unknown as MailParserService

    // Create mock fetcher
    mockFetcher = {
      protocolType: 'IMAP',
      connect: vi.fn(),
      disconnect: vi.fn(),
      testConnection: vi.fn(),
      fetchNewEmails: vi.fn(),
      markAsRead: vi.fn(),
      moveToFolder: vi.fn(),
      deleteMessage: vi.fn(),
    } as unknown as IMailFetcher

    service = new EmailSyncService(
      mockDataSource,
      mockSettingsService,
      mockMailParserService
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sync', () => {
    it('should fetch and save emails using streaming', async () => {
      // Mock fetcher to yield emails
      const mockEmails: FetchedEmail[] = [
        {
          uid: 1,
          subject: 'Test Email',
          from: 'sender@example.com',
          date: new Date('2024-01-15'),
          rawContent: 'Raw email content',
          hasAttachments: false,
        },
      ]

      async function* mockGenerator(): AsyncGenerator<FetchedEmail, void, unknown> {
        for (const email of mockEmails) {
          yield email
        }
      }

      vi.mocked(mockFetcher.fetchNewEmails).mockReturnValue(mockGenerator())

      // Mock factory to return mock fetcher
      const { MailFetcherFactory } = await import('./MailFetcherFactory')
      vi.mocked(MailFetcherFactory).mockImplementation(() => ({
        getFetcher: vi.fn().mockResolvedValue(mockFetcher),
        reset: vi.fn(),
      }))

      // Recreate service with mocked factory
      service = new EmailSyncService(mockDataSource, mockSettingsService, mockMailParserService)

      // Mock mail parser
      vi.mocked(mockMailParserService.parse).mockResolvedValue({
        subject: 'Test Email',
        from: 'sender@example.com',
        text: 'Email body',
        html: null,
        date: new Date('2024-01-15'),
        hasAttachments: false,
      })
      vi.mocked(mockMailParserService.extractText).mockReturnValue('Email body')
      vi.mocked(mockMailParserService.createSnippet).mockReturnValue('Email body')

      // Mock repository
      vi.mocked(mockRepository.save).mockResolvedValue({ id: 1 } as Email)

      const result = await service.sync()

      expect(result.syncedCount).toBe(1)
      expect(result.error).toBeUndefined()
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should handle empty inbox', async () => {
      async function* emptyGenerator(): AsyncGenerator<FetchedEmail, void, unknown> {
        // No emails to yield
      }

      vi.mocked(mockFetcher.fetchNewEmails).mockReturnValue(emptyGenerator())

      const { MailFetcherFactory } = await import('./MailFetcherFactory')
      vi.mocked(MailFetcherFactory).mockImplementation(() => ({
        getFetcher: vi.fn().mockResolvedValue(mockFetcher),
        reset: vi.fn(),
      }))

      service = new EmailSyncService(mockDataSource, mockSettingsService, mockMailParserService)

      const result = await service.sync()

      expect(result.syncedCount).toBe(0)
      expect(result.error).toBeUndefined()
    })

    it('should handle connection errors', async () => {
      const { MailFetcherFactory } = await import('./MailFetcherFactory')
      vi.mocked(MailFetcherFactory).mockImplementation(() => ({
        getFetcher: vi.fn().mockRejectedValue(new Error('Connection failed')),
        reset: vi.fn(),
      }))

      service = new EmailSyncService(mockDataSource, mockSettingsService, mockMailParserService)

      const result = await service.sync()

      expect(result.syncedCount).toBe(0)
      expect(result.error).toBe('Connection failed')
    })

    it('should prevent concurrent syncs', async () => {
      async function* slowGenerator(): AsyncGenerator<FetchedEmail, void, unknown> {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      vi.mocked(mockFetcher.fetchNewEmails).mockReturnValue(slowGenerator())

      const { MailFetcherFactory } = await import('./MailFetcherFactory')
      vi.mocked(MailFetcherFactory).mockImplementation(() => ({
        getFetcher: vi.fn().mockResolvedValue(mockFetcher),
        reset: vi.fn(),
      }))

      service = new EmailSyncService(mockDataSource, mockSettingsService, mockMailParserService)

      // Start two syncs concurrently
      const sync1 = service.sync()
      const sync2 = service.sync()

      const [result1, result2] = await Promise.all([sync1, sync2])

      // One should succeed, one should be blocked
      const blockedCount = result1.error === 'Sync already in progress' || result2.error === 'Sync already in progress' ? 1 : 0
      expect(blockedCount).toBe(1)
    })
  })

  describe('startPolling', () => {
    it('should start cron job with default interval', async () => {
      const cron = await import('node-cron')

      service.startPolling()

      expect(cron.default.schedule).toHaveBeenCalledWith(
        '*/5 * * * *',
        expect.any(Function)
      )
    })

    it('should start cron job with custom interval', async () => {
      const cron = await import('node-cron')

      service.startPolling(10)

      expect(cron.default.schedule).toHaveBeenCalledWith(
        '*/10 * * * *',
        expect.any(Function)
      )
    })

    it('should not start duplicate polling', async () => {
      const cron = await import('node-cron')

      service.startPolling()
      service.startPolling()

      expect(cron.default.schedule).toHaveBeenCalledTimes(1)
    })
  })

  describe('stopPolling', () => {
    it('should stop the cron job', async () => {
      const cron = await import('node-cron')
      const mockTask = { stop: vi.fn() }
      vi.mocked(cron.default.schedule).mockReturnValue(mockTask as unknown as ReturnType<typeof cron.default.schedule>)

      service.startPolling()
      service.stopPolling()

      // After stopping, isPolling should return false
      expect(service.isPolling()).toBe(false)
    })

    it('should be safe to call when not polling', () => {
      expect(() => service.stopPolling()).not.toThrow()
    })
  })

  describe('isPolling', () => {
    it('should return false initially', () => {
      expect(service.isPolling()).toBe(false)
    })

    it('should return true after starting', async () => {
      service.startPolling()
      expect(service.isPolling()).toBe(true)
    })

    it('should return false after stopping', async () => {
      service.startPolling()
      service.stopPolling()
      expect(service.isPolling()).toBe(false)
    })
  })
})
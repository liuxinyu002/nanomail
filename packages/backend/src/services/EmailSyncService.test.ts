import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailSyncService, type SyncResult } from './EmailSyncService'
import type { DataSource, Repository } from 'typeorm'
import type { Email } from '../entities/Email.entity'
import type { ImapService } from './ImapService'
import type { MailParserService } from './MailParserService'

// Mock node-cron
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(() => 'task-id'),
    stop: vi.fn(),
  },
}))

describe('EmailSyncService', () => {
  let service: EmailSyncService
  let mockDataSource: DataSource
  let mockRepository: Repository<Email>
  let mockImapService: ImapService
  let mockMailParserService: MailParserService

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      save: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    } as unknown as Repository<Email>

    // Create mock data source
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue(mockRepository),
      isInitialized: true,
    } as unknown as DataSource

    // Create mock IMAP service
    mockImapService = {
      fetchUnseen: vi.fn(),
      testConnection: vi.fn(),
      close: vi.fn(),
    } as unknown as ImapService

    // Create mock mail parser service
    mockMailParserService = {
      parse: vi.fn(),
      extractText: vi.fn(),
      createSnippet: vi.fn(),
    } as unknown as MailParserService

    service = new EmailSyncService(
      mockDataSource,
      mockImapService,
      mockMailParserService
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('syncEmails', () => {
    it('should fetch and save unseen emails', async () => {
      // Mock IMAP fetch
      vi.mocked(mockImapService.fetchUnseen).mockResolvedValue([
        {
          uid: 1,
          subject: 'Test Email',
          from: 'sender@example.com',
          date: new Date('2024-01-15'),
          rawContent: 'Raw email content',
          hasAttachments: false,
        },
      ])

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

      const result = await service.syncEmails()

      expect(result.success).toBe(true)
      expect(result.emailsFetched).toBe(1)
      expect(result.emailsSaved).toBe(1)
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should handle empty inbox', async () => {
      vi.mocked(mockImapService.fetchUnseen).mockResolvedValue([])

      const result = await service.syncEmails()

      expect(result.success).toBe(true)
      expect(result.emailsFetched).toBe(0)
      expect(result.emailsSaved).toBe(0)
    })

    it('should handle IMAP connection errors', async () => {
      vi.mocked(mockImapService.fetchUnseen).mockRejectedValue(
        new Error('Connection failed')
      )

      const result = await service.syncEmails()

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Connection failed')
    })

    it('should handle parsing errors for individual emails', async () => {
      vi.mocked(mockImapService.fetchUnseen).mockResolvedValue([
        {
          uid: 1,
          subject: 'Bad Email',
          from: 'sender@example.com',
          date: new Date(),
          rawContent: 'Invalid content',
          hasAttachments: false,
        },
        {
          uid: 2,
          subject: 'Good Email',
          from: 'sender2@example.com',
          date: new Date(),
          rawContent: 'Valid content',
          hasAttachments: false,
        },
      ])

      // First parse fails, second succeeds
      vi.mocked(mockMailParserService.parse)
        .mockRejectedValueOnce(new Error('Parse error'))
        .mockResolvedValueOnce({
          subject: 'Good Email',
          from: 'sender2@example.com',
          text: 'Valid body',
          html: null,
          date: new Date(),
          hasAttachments: false,
        })

      vi.mocked(mockMailParserService.extractText).mockReturnValue('Valid body')
      vi.mocked(mockMailParserService.createSnippet).mockReturnValue('Valid body')
      vi.mocked(mockRepository.save).mockResolvedValue({ id: 2 } as Email)

      const result = await service.syncEmails()

      expect(result.success).toBe(true)
      expect(result.emailsFetched).toBe(2)
      expect(result.emailsSaved).toBe(1)
      expect(result.errors.length).toBe(1)
    })

    it('should respect the limit parameter', async () => {
      vi.mocked(mockImapService.fetchUnseen).mockResolvedValue([])

      await service.syncEmails(5)

      expect(mockImapService.fetchUnseen).toHaveBeenCalledWith(5)
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
      vi.mocked(cron.default.schedule).mockReturnValue(mockTask as unknown as string)

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
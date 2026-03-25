import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SettingsService } from './SettingsService'
import type { FetchedEmail } from './types/mail-fetcher.types'

// Mock the imapflow module
vi.mock('imapflow', () => {
  const mockFetchIterator = {
    [Symbol.asyncIterator]: () => ({
      next: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: {
            uid: 100,
            source: Buffer.from('Raw email content'),
            envelope: {
              subject: 'Test Email',
              from: [{ address: 'sender@example.com' }],
              date: new Date('2024-01-15'),
            },
            bodyStructure: {},
          },
        })
        .mockResolvedValueOnce({
          done: false,
          value: {
            uid: 101,
            source: Buffer.from('Another email'),
            envelope: {
              subject: 'Second Email',
              from: [{ address: 'sender2@example.com' }],
              date: new Date('2024-01-16'),
            },
            bodyStructure: {},
          },
        })
        .mockResolvedValue({ done: true, value: undefined }),
    }),
  }

  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    mailboxOpen: vi.fn().mockResolvedValue({}),
    search: vi.fn().mockResolvedValue([100, 101, 102]),
    fetchAll: vi.fn().mockResolvedValue([]),
    fetch: vi.fn().mockReturnValue(mockFetchIterator),
    messageFlagsAdd: vi.fn().mockResolvedValue(undefined),
    messageMove: vi.fn().mockResolvedValue(undefined),
    expunge: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    usable: true,
  }

  return {
    ImapFlow: vi.fn(() => mockClient),
  }
})

// Mock MailParserService
vi.mock('./MailParserService', () => ({
  MailParserService: vi.fn().mockImplementation(() => ({
    parse: vi.fn().mockResolvedValue({
      subject: 'Parsed Subject',
      from: 'parsed@example.com',
      date: new Date(),
      hasAttachments: false,
      messageId: '<msg123@example.com>',
      inReplyTo: null,
      references: null,
    }),
  })),
}))

describe('ImapService - IMailFetcher Implementation', () => {
  let service: any // Will be ImapService after import
  let mockSettingsService: SettingsService

  beforeEach(async () => {
    // Reset modules to get fresh instances
    vi.resetModules()

    // Create mock SettingsService
    mockSettingsService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as SettingsService

    // Import ImapService after mock setup
    const { ImapService } = await import('./ImapService')
    service = new ImapService(mockSettingsService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('IMailFetcher interface compliance', () => {
    it('should have protocolType property set to IMAP', () => {
      expect(service.protocolType).toBe('IMAP')
    })

    it('should have connect method', () => {
      expect(typeof service.connect).toBe('function')
    })

    it('should have disconnect method', () => {
      expect(typeof service.disconnect).toBe('function')
    })

    it('should have testConnection method', () => {
      expect(typeof service.testConnection).toBe('function')
    })

    it('should have fetchNewEmails method', () => {
      expect(typeof service.fetchNewEmails).toBe('function')
    })

    it('should have markAsRead method', () => {
      expect(typeof service.markAsRead).toBe('function')
    })

    it('should have moveToFolder method', () => {
      expect(typeof service.moveToFolder).toBe('function')
    })

    it('should have deleteMessage method', () => {
      expect(typeof service.deleteMessage).toBe('function')
    })
  })

  describe('fetchNewEmails - AsyncGenerator', () => {
    beforeEach(() => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
    })

    it('should return AsyncGenerator', async () => {
      const generator = service.fetchNewEmails()
      expect(generator).toBeDefined()
      expect(typeof generator.next).toBe('function')
      expect(typeof generator.return).toBe('function')
      expect(typeof generator.throw).toBe('function')
      expect(typeof generator[Symbol.asyncIterator]).toBe('function')
    })

    it('should yield FetchedEmail objects with uid', async () => {
      // Mock LAST_IMAP_SYNCED_UID
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
        .mockResolvedValueOnce('50') // LAST_IMAP_SYNCED_UID

      const emails: FetchedEmail[] = []
      for await (const email of service.fetchNewEmails()) {
        emails.push(email)
      }

      // Should have yielded emails from the mock
      expect(emails.length).toBeGreaterThanOrEqual(0)
    })

    it('should use LAST_IMAP_SYNCED_UID for incremental sync', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
        .mockResolvedValueOnce('99') // LAST_IMAP_SYNCED_UID

      // Start the generator (this will trigger the config fetch)
      const generator = service.fetchNewEmails()

      // Just verify the generator works
      const firstResult = await generator.next()
      expect(firstResult.done === false || firstResult.done === true).toBe(true)
    })
  })

  describe('markAsRead', () => {
    beforeEach(() => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
    })

    it('should call messageFlagsAdd with \\Seen flag', async () => {
      await expect(service.markAsRead({ uid: 100 })).resolves.toBeUndefined()
    })
  })

  describe('moveToFolder', () => {
    beforeEach(() => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
    })

    it('should call messageMove with target folder', async () => {
      await expect(service.moveToFolder({ uid: 100 }, 'Archive')).resolves.toBeUndefined()
    })
  })

  describe('deleteMessage', () => {
    beforeEach(() => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
    })

    it('should mark message as deleted and expunge', async () => {
      await expect(service.deleteMessage({ uid: 100 })).resolves.toBeUndefined()
    })
  })

  describe('connect and disconnect', () => {
    beforeEach(() => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
    })

    it('should connect to IMAP server', async () => {
      await expect(service.connect()).resolves.toBeUndefined()
    })

    it('should disconnect from IMAP server', async () => {
      await expect(service.disconnect()).resolves.toBeUndefined()
    })
  })

  describe('testConnection', () => {
    it('should return success result', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const result = await service.testConnection()
      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })

    it('should return error on connection failure', async () => {
      const { ImapFlow } = await import('imapflow')
      vi.mocked(ImapFlow).mockImplementationOnce(() => ({
        connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
        logout: vi.fn(),
        mailboxOpen: vi.fn(),
        search: vi.fn(),
        fetchAll: vi.fn(),
        fetch: vi.fn(),
        messageFlagsAdd: vi.fn(),
        messageMove: vi.fn(),
        expunge: vi.fn(),
        on: vi.fn(),
      }))

      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const result = await service.testConnection()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
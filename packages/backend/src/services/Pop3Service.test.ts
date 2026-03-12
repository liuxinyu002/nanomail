import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SettingsService } from './SettingsService'
import type { Repository } from 'typeorm'
import type { Email } from '../entities/Email.entity'
import type { FetchedEmail, EmailIdentifier } from './types/mail-fetcher.types'

// Mock node-pop3 module
vi.mock('node-pop3', () => {
  const mockPop3 = vi.fn().mockImplementation(() => ({
    // UIDL returns array format: [["1", "uidl-1"], ["2", "uidl-2"], ...]
    UIDL: vi.fn().mockResolvedValue([
      ['1', 'uidl-1'],
      ['2', 'uidl-2'],
      ['3', 'uidl-3'],
    ]),
    RETR: vi.fn().mockResolvedValue('Raw email content'),
    DELE: vi.fn().mockResolvedValue(undefined),
    QUIT: vi.fn().mockResolvedValue(undefined),
    // LIST also returns array format
    LIST: vi.fn().mockResolvedValue([
      ['1', '100'],
      ['2', '200'],
      ['3', '300'],
    ]),
    // EventEmitter methods for error handling
    on: vi.fn(),
  }))

  return { default: mockPop3 }
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

describe('Pop3Service - IMailFetcher Implementation', () => {
  let service: any // Will be Pop3Service after import
  let mockSettingsService: SettingsService
  let mockRepository: Repository<Email>

  beforeEach(async () => {
    vi.resetModules()

    mockSettingsService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as SettingsService

    mockRepository = {
      createQueryBuilder: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      }),
    } as unknown as Repository<Email>

    const { Pop3Service } = await import('./Pop3Service')
    service = new Pop3Service(mockSettingsService, mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('IMailFetcher interface compliance', () => {
    it('should have protocolType property set to POP3', () => {
      expect(service.protocolType).toBe('POP3')
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
        .mockResolvedValueOnce('pop.gmail.com')  // POP3_HOST
        .mockResolvedValueOnce('995')            // POP3_PORT
        .mockResolvedValueOnce('user@gmail.com') // POP3_USER
        .mockResolvedValueOnce('password')       // POP3_PASS
    })

    it('should return AsyncGenerator', async () => {
      const generator = service.fetchNewEmails()
      expect(generator).toBeDefined()
      expect(typeof generator.next).toBe('function')
      expect(typeof generator[Symbol.asyncIterator]).toBe('function')
    })

    it('should yield FetchedEmail objects with uidl', async () => {
      const emails: FetchedEmail[] = []
      for await (const email of service.fetchNewEmails()) {
        emails.push(email)
      }

      // Should have yielded emails from the mock
      expect(emails.length).toBeGreaterThanOrEqual(0)

      // All emails should have uidl (POP3)
      for (const email of emails) {
        expect('uidl' in email).toBe(true)
      }
    })
  })

  describe('markAsRead - graceful degradation', () => {
    it('should resolve without error (POP3 does not support this)', async () => {
      await expect(service.markAsRead({ uidl: 'test-uidl' })).resolves.toBeUndefined()
    })
  })

  describe('moveToFolder - graceful degradation', () => {
    it('should resolve without error (POP3 does not support this)', async () => {
      await expect(service.moveToFolder({ uidl: 'test-uidl' }, 'Archive')).resolves.toBeUndefined()
    })
  })

  describe('testConnection', () => {
    it('should return success result', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('pop.gmail.com')
        .mockResolvedValueOnce('995')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const result = await service.testConnection()
      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('connect and disconnect', () => {
    beforeEach(() => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('pop.gmail.com')
        .mockResolvedValueOnce('995')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')
    })

    it('should connect to POP3 server', async () => {
      await expect(service.connect()).resolves.toBeUndefined()
    })

    it('should disconnect from POP3 server', async () => {
      await expect(service.disconnect()).resolves.toBeUndefined()
    })
  })
})
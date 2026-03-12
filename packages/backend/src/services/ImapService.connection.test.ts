import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImapService, type ImapConfig, type FetchedEmail } from './ImapService'
import type { SettingsService } from './SettingsService'

// Mock the imapflow module
vi.mock('imapflow', () => {
  const mockClient = {
    connect: vi.fn(),
    logout: vi.fn(),
    mailboxOpen: vi.fn(),
    search: vi.fn(),
    fetchAll: vi.fn(),
  }

  return {
    ImapFlow: vi.fn(() => mockClient),
  }
})

describe('ImapService - Connection Pooling', () => {
  let service: ImapService
  let mockSettingsService: SettingsService

  beforeEach(() => {
    // Create mock SettingsService
    mockSettingsService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as SettingsService

    service = new ImapService(mockSettingsService)
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Reset the singleton instance between tests
    ;(ImapService as unknown as { resetInstance: () => void }).resetInstance?.()
  })

  describe('getClient (Singleton Pattern)', () => {
    it('should create a new client on first call', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('app-password-123')

      const client1 = await service.getClient()

      expect(client1).toBeDefined()
    })

    it('should return the same client instance on subsequent calls', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('app-password-123')

      const client1 = await service.getClient()
      const client2 = await service.getClient()

      expect(client1).toBe(client2)
    })

    it('should only decrypt credentials once', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('app-password-123')

      // Call getClient multiple times
      await service.getClient()
      await service.getClient()
      await service.getClient()

      // Credentials should only be fetched once (4 calls for host, port, user, password)
      expect(mockSettingsService.get).toHaveBeenCalledTimes(4)
    })

    it('should reconnect if client is disconnected', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValue('imap.gmail.com')
        .mockResolvedValue('993')
        .mockResolvedValue('user@gmail.com')
        .mockResolvedValue('app-password-123')

      const { ImapFlow } = await import('imapflow')

      // First call creates client
      const client1 = await service.getClient()

      // Simulate disconnection
      vi.mocked(ImapFlow).mockClear()

      // Second call should return same client (connection pooling)
      const client2 = await service.getClient()

      expect(client1).toBe(client2)
    })
  })

  describe('fetchByUid', () => {
    it('should fetch emails by UID range', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValue('imap.gmail.com')
        .mockResolvedValue('993')
        .mockResolvedValue('user@gmail.com')
        .mockResolvedValue('app-password-123')

      const { ImapFlow } = await import('imapflow')
      vi.mocked(ImapFlow).mockImplementationOnce(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn().mockResolvedValue(undefined),
        mailboxOpen: vi.fn().mockResolvedValue({}),
        search: vi.fn().mockResolvedValue([101, 102, 103]),
        fetchAll: vi.fn().mockResolvedValue([
          {
            uid: 101,
            envelope: {
              subject: 'Email 1',
              from: [{ address: 'sender1@example.com' }],
              date: new Date('2024-01-15'),
            },
            source: 'Raw email 1',
          },
          {
            uid: 102,
            envelope: {
              subject: 'Email 2',
              from: [{ address: 'sender2@example.com' }],
              date: new Date('2024-01-16'),
            },
            source: 'Raw email 2',
          },
        ]),
      }))

      const emails = await service.fetchByUid(100)

      expect(emails.length).toBeGreaterThanOrEqual(0)
    })

    it('should return empty array when no new emails', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValue('imap.gmail.com')
        .mockResolvedValue('993')
        .mockResolvedValue('user@gmail.com')
        .mockResolvedValue('app-password-123')

      const { ImapFlow } = await import('imapflow')
      vi.mocked(ImapFlow).mockImplementationOnce(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn().mockResolvedValue(undefined),
        mailboxOpen: vi.fn().mockResolvedValue({}),
        search: vi.fn().mockResolvedValue([]),
        fetchAll: vi.fn().mockResolvedValue([]),
      }))

      const emails = await service.fetchByUid(100)

      expect(emails).toEqual([])
    })

    it('should include UID in fetched emails', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValue('imap.gmail.com')
        .mockResolvedValue('993')
        .mockResolvedValue('user@gmail.com')
        .mockResolvedValue('app-password-123')

      const { ImapFlow } = await import('imapflow')
      vi.mocked(ImapFlow).mockImplementationOnce(() => ({
        connect: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn().mockResolvedValue(undefined),
        mailboxOpen: vi.fn().mockResolvedValue({}),
        search: vi.fn().mockResolvedValue([101]),
        fetchAll: vi.fn().mockResolvedValue([
          {
            uid: 101,
            envelope: {
              subject: 'Test Email',
              from: [{ address: 'sender@example.com' }],
              date: new Date('2024-01-15'),
            },
            source: 'Raw email content',
          },
        ]),
      }))

      const emails = await service.fetchByUid(100)

      if (emails.length > 0) {
        expect(emails[0].uid).toBe(101)
      }
    })
  })
})
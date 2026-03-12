import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ImapService, type ImapConfig } from './ImapService'
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

describe('ImapService', () => {
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
  })

  describe('getConfig', () => {
    it('should retrieve and construct ImapConfig from settings', async () => {
      // Setup mock responses
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com') // IMAP_HOST
        .mockResolvedValueOnce('993') // IMAP_PORT
        .mockResolvedValueOnce('user@gmail.com') // IMAP_USER
        .mockResolvedValueOnce('app-password-123') // IMAP_PASS

      const config = await service.getConfig()

      expect(config).toEqual({
        host: 'imap.gmail.com',
        port: 993,
        user: 'user@gmail.com',
        password: 'app-password-123',
        tls: true,
      })
    })

    it('should throw error if IMAP_HOST is missing', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce(null) // IMAP_HOST missing

      await expect(service.getConfig()).rejects.toThrow('IMAP_HOST is not configured')
    })

    it('should throw error if IMAP_USER is missing', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com') // IMAP_HOST
        .mockResolvedValueOnce('993') // IMAP_PORT
        .mockResolvedValueOnce(null) // IMAP_USER missing

      await expect(service.getConfig()).rejects.toThrow('IMAP_USER is not configured')
    })

    it('should use default port 993 if IMAP_PORT is not set', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com') // IMAP_HOST
        .mockResolvedValueOnce(null) // IMAP_PORT not set
        .mockResolvedValueOnce('user@gmail.com') // IMAP_USER
        .mockResolvedValueOnce('password') // IMAP_PASS

      const config = await service.getConfig()

      expect(config.port).toBe(993)
    })
  })

  describe('testConnection', () => {
    it('should return success when connection succeeds', async () => {
      // Setup settings
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('imap.gmail.com')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const result = await service.testConnection()

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return failure when connection fails', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('invalid.host')
        .mockResolvedValueOnce('993')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('wrong-password')

      // Mock connection failure
      const { ImapFlow } = await import('imapflow')
      vi.mocked(ImapFlow).mockImplementationOnce(() => ({
        connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
        logout: vi.fn(),
        mailboxOpen: vi.fn(),
        search: vi.fn(),
        fetchAll: vi.fn(),
      }))

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection refused')
    })
  })
})
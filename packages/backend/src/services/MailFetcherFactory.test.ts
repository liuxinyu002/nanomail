import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SettingsService } from './SettingsService'
import type { Repository } from 'typeorm'
import type { Email } from '../entities/Email.entity'
import type { IMailFetcher } from './interfaces/IMailFetcher.interface'

// Mock ImapService
vi.mock('./ImapService', () => ({
  ImapService: vi.fn().mockImplementation(() => ({
    protocolType: 'IMAP',
  })),
}))

// Mock Pop3Service
vi.mock('./Pop3Service', () => ({
  Pop3Service: vi.fn().mockImplementation(() => ({
    protocolType: 'POP3',
  })),
}))

describe('MailFetcherFactory', () => {
  let factory: any
  let mockSettingsService: SettingsService
  let mockRepository: Repository<Email>

  beforeEach(async () => {
    vi.resetModules()

    mockSettingsService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as SettingsService

    mockRepository = {} as unknown as Repository<Email>

    const { MailFetcherFactory } = await import('./MailFetcherFactory')
    factory = new MailFetcherFactory(mockSettingsService, mockRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getFetcher', () => {
    it('should return IMAP fetcher when PROTOCOL_TYPE is IMAP', async () => {
      vi.mocked(mockSettingsService.get).mockResolvedValueOnce('IMAP')

      const fetcher = await factory.getFetcher()

      expect(fetcher.protocolType).toBe('IMAP')
    })

    it('should return POP3 fetcher when PROTOCOL_TYPE is POP3', async () => {
      vi.mocked(mockSettingsService.get).mockResolvedValueOnce('POP3')

      const fetcher = await factory.getFetcher()

      expect(fetcher.protocolType).toBe('POP3')
    })

    it('should default to IMAP when PROTOCOL_TYPE is not set', async () => {
      vi.mocked(mockSettingsService.get).mockResolvedValueOnce(null)

      const fetcher = await factory.getFetcher()

      expect(fetcher.protocolType).toBe('IMAP')
    })

    it('should default to IMAP when PROTOCOL_TYPE is unknown', async () => {
      vi.mocked(mockSettingsService.get).mockResolvedValueOnce('UNKNOWN')

      const fetcher = await factory.getFetcher()

      expect(fetcher.protocolType).toBe('IMAP')
    })

    it('should return cached instance on subsequent calls', async () => {
      vi.mocked(mockSettingsService.get).mockResolvedValue('IMAP')

      const fetcher1 = await factory.getFetcher()
      const fetcher2 = await factory.getFetcher()

      expect(fetcher1).toBe(fetcher2)
    })
  })

  describe('reset', () => {
    it('should clear cached instances', async () => {
      vi.mocked(mockSettingsService.get).mockResolvedValue('IMAP')

      const fetcher1 = await factory.getFetcher()
      factory.reset()
      const fetcher2 = await factory.getFetcher()

      expect(fetcher1).not.toBe(fetcher2)
    })
  })
})
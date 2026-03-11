import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SmtpService, type SendEmailOptions } from './SmtpService'
import type { SettingsService } from './SettingsService'

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: vi.fn(),
      sendMail: vi.fn(),
    })),
  },
}))

describe('SmtpService', () => {
  let service: SmtpService
  let mockSettingsService: SettingsService

  beforeEach(() => {
    mockSettingsService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    } as unknown as SettingsService

    service = new SmtpService(mockSettingsService)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfig', () => {
    it('should retrieve and construct SmtpConfig from settings', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('app-password-123')

      const config = await service.getConfig()

      expect(config).toEqual({
        host: 'smtp.gmail.com',
        port: 587,
        user: 'user@gmail.com',
        password: 'app-password-123',
        secure: false,
      })
    })

    it('should throw error if SMTP_HOST is missing', async () => {
      vi.mocked(mockSettingsService.get).mockResolvedValueOnce(null)

      await expect(service.getConfig()).rejects.toThrow('SMTP_HOST is not configured')
    })

    it('should throw error if SMTP_USER is missing', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce(null)

      await expect(service.getConfig()).rejects.toThrow('SMTP_USER is not configured')
    })

    it('should use default port 587 if SMTP_PORT is not set', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const config = await service.getConfig()

      expect(config.port).toBe(587)
    })

    it('should set secure=true for port 465', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('465')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const config = await service.getConfig()

      expect(config.secure).toBe(true)
    })
  })

  describe('testConnection', () => {
    it('should return success when connection succeeds', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const result = await service.testConnection()

      expect(result.success).toBe(true)
    })

    it('should return failure when connection fails', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('invalid.host')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('wrong-password')

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: vi.fn().mockRejectedValue(new Error('Connection refused')),
        sendMail: vi.fn(),
      })

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection refused')
    })
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const mockSendMail = vi.fn().mockResolvedValue({
        messageId: '<message-id@example.com>',
      })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body',
      }

      const result = await service.sendEmail(options)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('<message-id@example.com>')
    })

    it('should handle send failure', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const mockSendMail = vi.fn().mockRejectedValue(new Error('Send failed'))
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body',
      }

      const result = await service.sendEmail(options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Send failed')
    })

    it('should include replyTo header when provided', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body',
        replyTo: 'reply-to@example.com',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'reply-to@example.com',
        })
      )
    })

    it('should send HTML email when isHtml is true', async () => {
      vi.mocked(mockSettingsService.get)
        .mockResolvedValueOnce('smtp.gmail.com')
        .mockResolvedValueOnce('587')
        .mockResolvedValueOnce('user@gmail.com')
        .mockResolvedValueOnce('password')

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: '<html><body>HTML body</body></html>',
        isHtml: true,
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<html><body>HTML body</body></html>',
        })
      )
    })
  })
})
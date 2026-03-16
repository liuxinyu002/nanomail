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

  // Helper to set up default SMTP config mock
  const mockSmtpConfig = () => {
    vi.mocked(mockSettingsService.get)
      .mockResolvedValueOnce('smtp.gmail.com')
      .mockResolvedValueOnce('587')
      .mockResolvedValueOnce('user@gmail.com')
      .mockResolvedValueOnce('password')
  }

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
    it('should send email with single recipient (array format)', async () => {
      mockSmtpConfig()

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
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      }

      const result = await service.sendEmail(options)

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('<message-id@example.com>')
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
        })
      )
    })

    it('should send email with multiple recipients (comma-separated)', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      }

      const result = await service.sendEmail(options)

      expect(result.success).toBe(true)
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user1@example.com, user2@example.com, user3@example.com',
        })
      )
    })

    it('should send email with cc recipients', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        cc: ['cc1@example.com', 'cc2@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc1@example.com, cc2@example.com',
        })
      )
    })

    it('should send email with bcc recipients', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          bcc: 'bcc1@example.com, bcc2@example.com',
        })
      )
    })

    it('should send email with to, cc, and bcc combined', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['to@example.com'],
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'to@example.com',
          cc: 'cc@example.com',
          bcc: 'bcc@example.com',
        })
      )
    })

    // CRITICAL: Empty array handling - must NOT send empty string in cc/bcc headers
    it('should omit cc header when cc array is empty', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        cc: [],
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalled()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('cc')
      // Ensure cc is NOT an empty string (which could cause SMTP errors)
      expect(callArgs.cc).toBeUndefined()
    })

    it('should omit bcc header when bcc array is empty', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        bcc: [],
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalled()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('bcc')
      expect(callArgs.bcc).toBeUndefined()
    })

    it('should omit cc and bcc headers when both arrays are empty', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        cc: [],
        bcc: [],
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalled()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('cc')
      expect(callArgs).not.toHaveProperty('bcc')
    })

    it('should omit cc header when cc is undefined', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        // cc not provided
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalled()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('cc')
    })

    it('should omit bcc header when bcc is undefined', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        // bcc not provided
        subject: 'Test Subject',
        body: 'Test body',
      }

      await service.sendEmail(options)

      expect(mockSendMail).toHaveBeenCalled()
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('bcc')
    })

    it('should handle send failure', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockRejectedValue(new Error('Send failed'))
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      }

      const result = await service.sendEmail(options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Send failed')
    })

    it('should include replyTo header when provided', async () => {
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
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
      mockSmtpConfig()

      const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
      const mockVerify = vi.fn().mockResolvedValue(true)

      const nodemailer = await import('nodemailer')
      vi.mocked(nodemailer.default.createTransport).mockReturnValueOnce({
        verify: mockVerify,
        sendMail: mockSendMail,
      })

      const options: SendEmailOptions = {
        to: ['recipient@example.com'],
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
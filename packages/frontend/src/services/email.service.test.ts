import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailService, type EmailDetail } from './email.service'
import type { EmailsResponse, ProcessEmailsResponse } from './email.service'
import type { SendEmailInput, SendEmailResponse } from '@nanomail/shared'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('EmailService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getEmails', () => {
    it('should fetch emails with default pagination', async () => {
      const mockResponse: EmailsResponse = {
        emails: [
          {
            id: 1,
            subject: 'Test Email',
            sender: 'test@example.com',
            snippet: 'This is a test email...',
            summary: 'Test summary',
            date: '2024-01-01T00:00:00.000Z',
            isProcessed: false,
            classification: 'IMPORTANT', isSpam: false,
            hasAttachments: false,
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await EmailService.getEmails()

      // fetch is called with URL and options object containing signal (undefined when not provided)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/emails?page=1&limit=10',
        expect.objectContaining({ signal: undefined })
      )
      expect(result).toEqual(mockResponse)
    })

    it('should fetch emails with custom pagination', async () => {
      const mockResponse: EmailsResponse = {
        emails: [],
        pagination: { total: 0, page: 2, limit: 20, totalPages: 0 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await EmailService.getEmails({ page: 2, limit: 20 })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/emails?page=2&limit=20',
        expect.objectContaining({ signal: undefined })
      )
    })

    it('should filter by processed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ emails: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
      })

      await EmailService.getEmails({ processed: true })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/emails?page=1&limit=10&processed=true',
        expect.objectContaining({ signal: undefined })
      )
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(EmailService.getEmails()).rejects.toThrow('Failed to fetch emails')
    })

    it('should pass signal to fetch for request cancellation', async () => {
      const mockResponse: EmailsResponse = {
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const controller = new AbortController()
      const signal = controller.signal

      await EmailService.getEmails({ signal })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/emails?page=1&limit=10',
        expect.objectContaining({ signal })
      )
    })

    it('should throw AbortError when request is cancelled', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError')
      mockFetch.mockRejectedValueOnce(abortError)

      const controller = new AbortController()
      controller.abort()

      await expect(EmailService.getEmails({ signal: controller.signal })).rejects.toThrow(
        'The operation was aborted'
      )
    })

    it('should include signal in fetch options when provided', async () => {
      const mockResponse: EmailsResponse = {
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const controller = new AbortController()
      const signal = controller.signal

      await EmailService.getEmails({ page: 2, limit: 20, signal })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/emails?page=2&limit=20',
        expect.objectContaining({ signal })
      )
    })

    it('should work without signal (backward compatible)', async () => {
      const mockResponse: EmailsResponse = {
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      // Call without signal parameter
      await EmailService.getEmails({ page: 1, limit: 10 })

      // fetch is called with signal: undefined when not provided
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/emails?page=1&limit=10',
        expect.objectContaining({ signal: undefined })
      )
    })
  })

  describe('processEmails', () => {
    it('should process emails with valid IDs', async () => {
      const mockResponse: ProcessEmailsResponse = {
        success: true,
        queuedCount: 2,
        message: 'Queued 2 email(s) for processing',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await EmailService.processEmails([1, 2])

      expect(mockFetch).toHaveBeenCalledWith('/api/agent/process-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: [1, 2] }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw error for empty email IDs', async () => {
      await expect(EmailService.processEmails([])).rejects.toThrow('No email IDs provided')
    })

    it('should throw error when max limit exceeded', async () => {
      await expect(EmailService.processEmails([1, 2, 3, 4, 5, 6])).rejects.toThrow(
        'Maximum 5 emails can be processed at once'
      )
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(EmailService.processEmails([1])).rejects.toThrow('Failed to process emails')
    })
  })

  describe('getEmail', () => {
    it('should fetch a single email by ID', async () => {
      const mockEmail: EmailDetail = {
        id: 1,
        subject: 'Test Email',
        sender: 'test@example.com',
        snippet: 'This is a test email...',
        bodyText: 'Full email body text here.',
        date: '2024-01-01T00:00:00.000Z',
        isProcessed: false,
        classification: 'IMPORTANT', isSpam: false,
        hasAttachments: false,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmail),
      })

      const result = await EmailService.getEmail(1)

      expect(mockFetch).toHaveBeenCalledWith('/api/emails/1')
      expect(result).toEqual(mockEmail)
    })

    it('should throw error when email not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(EmailService.getEmail(999)).rejects.toThrow('Failed to fetch email')
    })
  })

  describe('sendEmail', () => {
    it('should send an email with single recipient (backward compatible)', async () => {
      const mockResponse: SendEmailResponse = {
        success: true,
        messageId: 'msg-123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await EmailService.sendEmail({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        body: 'Test body',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          body: 'Test body',
        }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should send an email with multiple recipients', async () => {
      const mockResponse: SendEmailResponse = {
        success: true,
        messageId: 'msg-456',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const emailData: SendEmailInput = {
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Multi-recipient Test',
        body: 'Test body for multiple recipients',
      }

      const result = await EmailService.sendEmail(emailData)

      expect(mockFetch).toHaveBeenCalledWith('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['recipient1@example.com', 'recipient2@example.com'],
          subject: 'Multi-recipient Test',
          body: 'Test body for multiple recipients',
        }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should send an email with cc and bcc recipients', async () => {
      const mockResponse: SendEmailResponse = {
        success: true,
        messageId: 'msg-789',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const emailData: SendEmailInput = {
        to: ['recipient@example.com'],
        cc: ['cc1@example.com', 'cc2@example.com'],
        bcc: ['bcc@example.com'],
        subject: 'Email with CC and BCC',
        body: 'Test body',
      }

      const result = await EmailService.sendEmail(emailData)

      expect(mockFetch).toHaveBeenCalledWith('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['recipient@example.com'],
          cc: ['cc1@example.com', 'cc2@example.com'],
          bcc: ['bcc@example.com'],
          subject: 'Email with CC and BCC',
          body: 'Test body',
        }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should send an email with replyTo and isHtml options', async () => {
      const mockResponse: SendEmailResponse = {
        success: true,
        messageId: 'msg-101',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const emailData: SendEmailInput = {
        to: ['recipient@example.com'],
        subject: 'HTML Email with Reply-To',
        body: '<p>HTML body content</p>',
        replyTo: 'replyto@example.com',
        isHtml: true,
      }

      const result = await EmailService.sendEmail(emailData)

      expect(mockFetch).toHaveBeenCalledWith('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['recipient@example.com'],
          subject: 'HTML Email with Reply-To',
          body: '<p>HTML body content</p>',
          replyTo: 'replyto@example.com',
          isHtml: true,
        }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should send plain text email when isHtml is false', async () => {
      const mockResponse: SendEmailResponse = {
        success: true,
        messageId: 'msg-102',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const emailData: SendEmailInput = {
        to: ['recipient@example.com'],
        subject: 'Plain Text Email',
        body: 'Plain text body content',
        isHtml: false,
      }

      const result = await EmailService.sendEmail(emailData)

      expect(mockFetch).toHaveBeenCalledWith('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ['recipient@example.com'],
          subject: 'Plain Text Email',
          body: 'Plain text body content',
          isHtml: false,
        }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw error when send fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(
        EmailService.sendEmail({
          to: ['recipient@example.com'],
          subject: 'Test Subject',
          body: 'Test body',
        })
      ).rejects.toThrow('Failed to send email')
    })

    it('should handle error response from server', async () => {
      const mockResponse: SendEmailResponse = {
        success: false,
        error: 'Invalid recipient email address',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await EmailService.sendEmail({
        to: ['invalid-email'],
        subject: 'Test',
        body: 'Body',
      })

      expect(result).toEqual({
        success: false,
        error: 'Invalid recipient email address',
      })
    })
  })
})
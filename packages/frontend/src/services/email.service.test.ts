import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailService, type EmailDetail } from './email.service'
import type { EmailsResponse, ProcessEmailsResponse } from './email.service'

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
            isSpam: false,
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

      expect(mockFetch).toHaveBeenCalledWith('/api/emails?page=1&limit=10')
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

      expect(mockFetch).toHaveBeenCalledWith('/api/emails?page=2&limit=20')
    })

    it('should filter by processed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ emails: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
      })

      await EmailService.getEmails({ processed: true })

      expect(mockFetch).toHaveBeenCalledWith('/api/emails?page=1&limit=10&processed=true')
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(EmailService.getEmails()).rejects.toThrow('Failed to fetch emails')
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
        isSpam: false,
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
    it('should send an email successfully', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await EmailService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test body',
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
          to: 'recipient@example.com',
          subject: 'Test Subject',
          body: 'Test body',
        })
      ).rejects.toThrow('Failed to send email')
    })
  })
})
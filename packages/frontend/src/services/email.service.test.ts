import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailService } from './email.service'
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
})
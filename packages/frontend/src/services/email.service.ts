/**
 * Email Service
 * Handles API calls for email operations
 */

export interface EmailListItem {
  id: number
  subject: string | null
  sender: string | null
  snippet: string | null
  summary: string | null
  date: string
  isProcessed: boolean
  isSpam: boolean
  hasAttachments: boolean
}

export interface EmailsResponse {
  emails: EmailListItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface EmailsQuery {
  page?: number
  limit?: number
  processed?: boolean
  spam?: boolean
}

export interface ProcessEmailsResponse {
  success: boolean
  queuedCount: number
  message: string
}

const MAX_EMAILS_PER_BATCH = 5

/**
 * Email Service - handles all email-related API calls
 */
export const EmailService = {
  /**
   * Fetch emails with pagination and optional filters
   */
  async getEmails(query: EmailsQuery = {}): Promise<EmailsResponse> {
    const { page = 1, limit = 10, processed, spam } = query

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (processed !== undefined) {
      params.set('processed', String(processed))
    }
    if (spam !== undefined) {
      params.set('spam', String(spam))
    }

    const response = await fetch(`/api/emails?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Failed to fetch emails')
    }

    return response.json()
  },

  /**
   * Process emails with AI analysis
   */
  async processEmails(emailIds: number[]): Promise<ProcessEmailsResponse> {
    if (emailIds.length === 0) {
      throw new Error('No email IDs provided')
    }

    if (emailIds.length > MAX_EMAILS_PER_BATCH) {
      throw new Error('Maximum 5 emails can be processed at once')
    }

    const response = await fetch('/api/agent/process-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailIds }),
    })

    if (!response.ok) {
      throw new Error('Failed to process emails')
    }

    return response.json()
  },
}
/**
 * Email Service
 * Handles API calls for email operations
 */

import type { EmailClassification, SendEmailInput, SendEmailResponse } from '@nanomail/shared'

// Re-export types for convenience
export type { EmailClassification, SendEmailInput, SendEmailResponse } from '@nanomail/shared'

export interface EmailListItem {
  id: number
  subject: string | null
  sender: string | null
  snippet: string | null
  summary: string | null
  date: string
  isProcessed: boolean
  classification: EmailClassification
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
  classification?: EmailClassification
  signal?: AbortSignal
}

export interface ProcessEmailsResponse {
  success: boolean
  queuedCount: number
  message: string
}

export interface EmailDetail {
  id: number
  subject: string | null
  sender: string | null
  snippet: string | null
  bodyText: string | null
  date: string
  isProcessed: boolean
  classification: EmailClassification
  isSpam: boolean
  hasAttachments: boolean
}

export interface SyncJobStatus {
  id: string
  accountId: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  result?: {
    syncedCount: number
    errors: string[]
  }
  error?: string
  createdAt: string
  updatedAt: string
}

export interface TriggerSyncResponse {
  jobId: string
  status: 'pending' | 'running'
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
    const { page = 1, limit = 10, processed, classification, signal } = query

    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(limit))

    if (processed !== undefined) {
      params.set('processed', String(processed))
    }
    if (classification) {
      params.set('classification', classification)
    }

    const response = await fetch(`/api/emails?${params.toString()}`, {
      signal,
    })

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

  /**
   * Get a single email by ID
   */
  async getEmail(id: number): Promise<EmailDetail> {
    const response = await fetch(`/api/emails/${id}`)

    if (!response.ok) {
      throw new Error('Failed to fetch email')
    }

    return response.json()
  },

  /**
   * Send an email
   * Supports multiple recipients via arrays for to, cc, and bcc fields
   * Optional fields (cc, bcc, isHtml) have sensible defaults on the backend
   */
  async sendEmail(data: SendEmailInput): Promise<SendEmailResponse> {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Failed to send email')
    }

    return response.json()
  },

  /**
   * Trigger an async email sync
   */
  async triggerSync(accountId: number = 1): Promise<TriggerSyncResponse> {
    const response = await fetch('/api/emails/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })

    if (!response.ok) {
      throw new Error('Failed to trigger sync')
    }

    return response.json()
  },

  /**
   * Get sync job status
   */
  async getSyncStatus(jobId: string): Promise<SyncJobStatus> {
    const response = await fetch(`/api/emails/sync/${jobId}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('JOB_NOT_FOUND')
      }
      throw new Error('Failed to get sync status')
    }

    return response.json()
  },
}
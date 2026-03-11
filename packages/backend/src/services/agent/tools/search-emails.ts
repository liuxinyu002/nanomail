/**
 * SearchEmailsTool - Search local email database
 * Example tool implementation using Zod schema
 */

import { z } from 'zod'
import { Tool } from './types'
import type { DataSource, Repository } from 'typeorm'
import { Email } from '../../../entities/Email.entity'

/**
 * Zod schema for search emails tool
 */
export const SearchEmailsSchema = z.object({
  query: z.string().describe('Search query (searches subject and body)'),
  limit: z.number().int().min(1).max(20).default(5).describe('Maximum results to return'),
  sender: z.string().optional().describe('Filter by sender email address'),
  dateFrom: z.string().optional().describe('Filter emails after this date (ISO 8601)'),
  dateTo: z.string().optional().describe('Filter emails before this date (ISO 8601)')
})

/**
 * Search parameters type
 */
export type SearchParams = z.infer<typeof SearchEmailsSchema>

/**
 * Search result interface
 */
export interface SearchResult {
  id: number
  sender: string | null
  subject: string | null
  date: Date
  snippet: string | null
}

/**
 * Tool to search the local email database
 */
export class SearchEmailsTool extends Tool<typeof SearchEmailsSchema> {
  readonly name = 'search_local_emails' as const
  readonly description = 'Search the local email database for relevant context. Use this when you need to find emails by keyword, sender, or date range.'
  readonly schema = SearchEmailsSchema

  constructor(public emailRepository: Repository<Email>) {
    super()
  }

  /**
   * Create tool from DataSource
   */
  static fromDataSource(dataSource: DataSource): SearchEmailsTool {
    const repository = dataSource.getRepository(Email)
    return new SearchEmailsTool(repository)
  }

  /**
   * Execute search with validated parameters
   */
  async execute(params: SearchParams): Promise<string> {
    try {
      const emails = await this.searchEmails(params)

      if (emails.length === 0) {
        return 'No emails found matching the query.'
      }

      return this.formatResults(emails)
    } catch (error) {
      return `Error searching emails: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  /**
   * Search emails in the repository
   */
  private async searchEmails(params: SearchParams): Promise<SearchResult[]> {
    const qb = this.emailRepository.createQueryBuilder('email')

    // Full-text search on subject and body
    qb.where(
      '(email.subject LIKE :query OR email.bodyText LIKE :query OR email.snippet LIKE :query)',
      { query: `%${params.query}%` }
    )

    // Sender filter
    if (params.sender) {
      qb.andWhere('email.sender LIKE :sender', { sender: `%${params.sender}%` })
    }

    // Date range filter
    if (params.dateFrom) {
      qb.andWhere('email.date >= :dateFrom', { dateFrom: new Date(params.dateFrom) })
    }
    if (params.dateTo) {
      qb.andWhere('email.date <= :dateTo', { dateTo: new Date(params.dateTo) })
    }

    // Order by date descending
    qb.orderBy('email.date', 'DESC')
      .limit(params.limit)

    const results = await qb.getMany()

    return results.map(email => ({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      date: email.date,
      snippet: email.snippet
    }))
  }

  /**
   * Format search results for display
   */
  private formatResults(emails: SearchResult[]): string {
    return emails.map((email, i) => {
      const lines = [
        `[${i + 1}] ID: ${email.id}`,
        `From: ${email.sender ?? 'Unknown'}`,
        `Subject: ${email.subject ?? '(No subject)'}`,
        `Date: ${email.date.toISOString()}`,
        `Snippet: ${email.snippet ?? '(No preview)'}`
      ]
      return lines.join('\n')
    }).join('\n\n')
  }
}
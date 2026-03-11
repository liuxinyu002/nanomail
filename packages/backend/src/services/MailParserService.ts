import { simpleParser, type ParsedMail } from 'mailparser'

/**
 * Parsed email data extracted from raw MIME content
 */
export interface ParsedEmail {
  subject: string | null
  from: string | null
  text: string | null
  html: string | null
  date: Date | null
  hasAttachments: boolean
}

/**
 * MailParserService parses raw MIME email content.
 *
 * Responsibilities:
 * - Parse raw email source using mailparser
 * - Extract plain text body (preferred over HTML)
 * - Detect attachments (flag only, no storage for MVP)
 */
export class MailParserService {
  /**
   * Parses raw email source into structured data.
   *
   * @param rawSource - Raw MIME email content
   * @returns ParsedEmail with extracted fields
   */
  async parse(rawSource: string | Buffer): Promise<ParsedEmail> {
    const parsed: ParsedMail = await simpleParser(rawSource)

    return {
      subject: parsed.subject ?? null,
      from: parsed.from?.value?.[0]?.address ?? null,
      text: parsed.text || null,
      html: parsed.html || null,
      date: parsed.date ?? null,
      hasAttachments: this.hasAttachments(parsed),
    }
  }

  /**
   * Checks if the parsed email has attachments.
   */
  private hasAttachments(parsed: ParsedMail): boolean {
    return Array.isArray(parsed.attachments) && parsed.attachments.length > 0
  }

  /**
   * Extracts the best available text content.
   * Prefers plain text over HTML.
   *
   * @param parsed - Parsed email data
   * @returns Plain text content or empty string
   */
  extractText(parsed: ParsedEmail): string {
    // Prefer plain text
    if (parsed.text) {
      return parsed.text
    }

    // Fall back to HTML, stripped of tags
    if (parsed.html) {
      return this.stripHtmlTags(parsed.html)
    }

    return ''
  }

  /**
   * Strips HTML tags from content.
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Creates a snippet from email body.
   * Limited to first 200 characters.
   *
   * @param text - Email body text
   * @returns Snippet string
   */
  createSnippet(text: string | null): string {
    if (!text) {
      return ''
    }

    // Normalize whitespace
    const normalized = text.replace(/\s+/g, ' ').trim()

    // Truncate to 200 characters
    if (normalized.length <= 200) {
      return normalized
    }

    return normalized.substring(0, 200)
  }
}
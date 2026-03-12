/**
 * Mail Fetcher Types
 *
 * Type definitions for mail fetching protocols (IMAP/POP3)
 */

/**
 * Protocol type enumeration
 */
export type ProtocolType = 'IMAP' | 'POP3'

/**
 * Base email data structure common to all protocols
 */
interface BaseFetchedEmail {
  subject: string | null
  from: string | null
  date: Date
  rawContent: string
  hasAttachments: boolean
  // Thread context fields (optional, populated by MailParserService)
  messageId?: string | null
  inReplyTo?: string | null
  references?: string[] | null
}

/**
 * Unified email data structure - uses union types to enforce type safety
 *
 * - IMAP protocol: must provide uid (number), uidl does not exist
 * - POP3 protocol: must provide uidl (string), uid does not exist
 */
export type FetchedEmail = BaseFetchedEmail &
  (
    | { uid: number; uidl?: never }
    | { uidl: string; uid?: never }
  )

/**
 * Email identifier (used for logging and error handling)
 */
export type EmailIdentifier = { uid: number } | { uidl: string }

/**
 * Mail fetcher error types
 */
export enum MailFetcherErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  FETCH_FAILED = 'FETCH_FAILED',
  PARSE_FAILED = 'PARSE_FAILED',
  PROTOCOL_NOT_SUPPORTED = 'PROTOCOL_NOT_SUPPORTED',
}

/**
 * Mail fetcher error class
 */
export class MailFetcherError extends Error {
  constructor(
    public readonly type: MailFetcherErrorType,
    message: string,
    public readonly identifier?: EmailIdentifier,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'MailFetcherError'
  }
}

/**
 * Type guard to check if an email identifier has uid
 */
export function hasUid(identifier: EmailIdentifier): identifier is { uid: number } {
  return 'uid' in identifier
}

/**
 * Type guard to check if an email identifier has uidl
 */
export function hasUidl(identifier: EmailIdentifier): identifier is { uidl: string } {
  return 'uidl' in identifier
}

/**
 * Type guard to check if a fetched email has uid (IMAP)
 */
export function hasUidField(email: FetchedEmail): email is BaseFetchedEmail & { uid: number } {
  return 'uid' in email
}

/**
 * Type guard to check if a fetched email has uidl (POP3)
 */
export function hasUidlField(email: FetchedEmail): email is BaseFetchedEmail & { uidl: string } {
  return 'uidl' in email
}

/**
 * Get a string representation of the email identifier for logging
 */
export function getIdentifierString(identifier: EmailIdentifier): string {
  if (hasUid(identifier)) {
    return `uid=${identifier.uid}`
  }
  return `uidl=${identifier.uidl}`
}
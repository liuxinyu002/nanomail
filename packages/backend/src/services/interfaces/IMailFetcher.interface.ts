/**
 * IMailFetcher Interface
 *
 * Mail fetcher adapter interface for abstracting IMAP/POP3 protocol differences
 */

import type { FetchedEmail, ProtocolType, EmailIdentifier } from '../types/mail-fetcher.types'

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean
  error?: string
}

/**
 * Mail fetcher adapter interface
 *
 * Responsibilities:
 * - Abstract IMAP/POP3 protocol differences
 * - Provide unified email fetching capabilities
 * - Support streaming with O(1) memory usage
 *
 * Implementation requirements:
 * - fetchNewEmails must return AsyncGenerator for streaming
 * - Single email download/parse failures should be logged and continue (granular error handling)
 * - POP3 unsupported methods (markAsRead, moveToFolder) should be no-op
 */
export interface IMailFetcher {
  /**
   * Protocol type identifier
   */
  readonly protocolType: ProtocolType

  /**
   * Establish connection to the server
   *
   * @throws Error if connection fails
   */
  connect(): Promise<void>

  /**
   * Disconnect from the server
   * Should be called in finally block to ensure resource cleanup
   */
  disconnect(): Promise<void>

  /**
   * Test server connection
   *
   * @returns ConnectionTestResult with success status and optional error message
   */
  testConnection(): Promise<ConnectionTestResult>

  /**
   * Fetch new emails (streaming)
   *
   * Design points:
   * - Returns AsyncGenerator for for await...of consumption
   * - IMAP: UID-based incremental range query using client.fetch native streaming
   * - POP3: UIDL full fetch -> local diff -> RETR serial download
   * - Single email failures should be logged and continue without interrupting the flow
   *
   * @returns AsyncGenerator<FetchedEmail, void, unknown>
   */
  fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown>

  /**
   * Mark email as read
   *
   * Protocol support:
   * - IMAP: Executes STORE +FLAGS \Seen
   * - POP3: Not supported, gracefully degrades to no-op
   *
   * @param identifier - Email unique identifier (IMAP: uid, POP3: uidl)
   */
  markAsRead(identifier: EmailIdentifier): Promise<void>

  /**
   * Move email to specified folder
   *
   * Protocol support:
   * - IMAP: Executes MOVE or COPY + STORE \Deleted
   * - POP3: Not supported, gracefully degrades to no-op
   *
   * @param identifier - Email unique identifier
   * @param folder - Target folder name
   */
  moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void>

  /**
   * Delete email
   *
   * Protocol support:
   * - IMAP: Marks \Deleted and executes EXPUNGE
   * - POP3: Executes DELE command
   *
   * @param identifier - Email unique identifier
   */
  deleteMessage(identifier: EmailIdentifier): Promise<void>
}
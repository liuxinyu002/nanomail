import { describe, it, expect } from 'vitest'
import {
  type FetchedEmail,
  type EmailIdentifier,
  type ProtocolType,
  MailFetcherError,
  MailFetcherErrorType,
  hasUid,
  hasUidl,
  hasUidField,
  hasUidlField,
  getIdentifierString,
} from './mail-fetcher.types'

describe('mail-fetcher.types', () => {
  describe('ProtocolType', () => {
    it('should accept IMAP as valid protocol type', () => {
      const protocol: ProtocolType = 'IMAP'
      expect(protocol).toBe('IMAP')
    })

    it('should accept POP3 as valid protocol type', () => {
      const protocol: ProtocolType = 'POP3'
      expect(protocol).toBe('POP3')
    })
  })

  describe('FetchedEmail union type', () => {
    it('should create valid IMAP email with uid', () => {
      const email: FetchedEmail = {
        uid: 12345,
        subject: 'Test Subject',
        from: 'sender@example.com',
        date: new Date(),
        rawContent: 'Raw email content',
        hasAttachments: false,
      }

      expect(email.uid).toBe(12345)
      expect(email.subject).toBe('Test Subject')
      expect('uidl' in email).toBe(false)
    })

    it('should create valid POP3 email with uidl', () => {
      const email: FetchedEmail = {
        uidl: 'unique-idl-string-123',
        subject: 'Test Subject',
        from: 'sender@example.com',
        date: new Date(),
        rawContent: 'Raw email content',
        hasAttachments: false,
      }

      expect(email.uidl).toBe('unique-idl-string-123')
      expect(email.subject).toBe('Test Subject')
      expect('uid' in email).toBe(false)
    })

    it('should allow optional thread context fields', () => {
      const email: FetchedEmail = {
        uid: 1,
        subject: 'Reply',
        from: 'sender@example.com',
        date: new Date(),
        rawContent: 'Content',
        hasAttachments: false,
        messageId: '<msg123@example.com>',
        inReplyTo: '<parent@example.com>',
        references: ['<parent@example.com>', '<grandparent@example.com>'],
      }

      expect(email.messageId).toBe('<msg123@example.com>')
      expect(email.inReplyTo).toBe('<parent@example.com>')
      expect(email.references).toHaveLength(2)
    })

    it('should allow null values for optional fields', () => {
      const email: FetchedEmail = {
        uid: 1,
        subject: null,
        from: null,
        date: new Date(),
        rawContent: 'Content',
        hasAttachments: false,
        messageId: null,
        inReplyTo: null,
        references: null,
      }

      expect(email.subject).toBeNull()
      expect(email.from).toBeNull()
      expect(email.messageId).toBeNull()
    })
  })

  describe('EmailIdentifier type', () => {
    it('should create identifier with uid', () => {
      const identifier: EmailIdentifier = { uid: 12345 }
      expect(identifier.uid).toBe(12345)
    })

    it('should create identifier with uidl', () => {
      const identifier: EmailIdentifier = { uidl: 'unique-idl-123' }
      expect(identifier.uidl).toBe('unique-idl-123')
    })
  })

  describe('hasUid type guard', () => {
    it('should return true for uid identifier', () => {
      const identifier: EmailIdentifier = { uid: 12345 }
      expect(hasUid(identifier)).toBe(true)
    })

    it('should return false for uidl identifier', () => {
      const identifier: EmailIdentifier = { uidl: 'unique-idl-123' }
      expect(hasUid(identifier)).toBe(false)
    })
  })

  describe('hasUidl type guard', () => {
    it('should return true for uidl identifier', () => {
      const identifier: EmailIdentifier = { uidl: 'unique-idl-123' }
      expect(hasUidl(identifier)).toBe(true)
    })

    it('should return false for uid identifier', () => {
      const identifier: EmailIdentifier = { uid: 12345 }
      expect(hasUidl(identifier)).toBe(false)
    })
  })

  describe('hasUidField type guard', () => {
    it('should return true for IMAP email with uid', () => {
      const email: FetchedEmail = {
        uid: 12345,
        subject: 'Test',
        from: 'test@example.com',
        date: new Date(),
        rawContent: 'Content',
        hasAttachments: false,
      }
      expect(hasUidField(email)).toBe(true)
    })

    it('should return false for POP3 email with uidl', () => {
      const email: FetchedEmail = {
        uidl: 'unique-idl-123',
        subject: 'Test',
        from: 'test@example.com',
        date: new Date(),
        rawContent: 'Content',
        hasAttachments: false,
      }
      expect(hasUidField(email)).toBe(false)
    })
  })

  describe('hasUidlField type guard', () => {
    it('should return true for POP3 email with uidl', () => {
      const email: FetchedEmail = {
        uidl: 'unique-idl-123',
        subject: 'Test',
        from: 'test@example.com',
        date: new Date(),
        rawContent: 'Content',
        hasAttachments: false,
      }
      expect(hasUidlField(email)).toBe(true)
    })

    it('should return false for IMAP email with uid', () => {
      const email: FetchedEmail = {
        uid: 12345,
        subject: 'Test',
        from: 'test@example.com',
        date: new Date(),
        rawContent: 'Content',
        hasAttachments: false,
      }
      expect(hasUidlField(email)).toBe(false)
    })
  })

  describe('getIdentifierString helper', () => {
    it('should return formatted string for uid identifier', () => {
      const identifier: EmailIdentifier = { uid: 12345 }
      expect(getIdentifierString(identifier)).toBe('uid=12345')
    })

    it('should return formatted string for uidl identifier', () => {
      const identifier: EmailIdentifier = { uidl: 'unique-idl-123' }
      expect(getIdentifierString(identifier)).toBe('uidl=unique-idl-123')
    })
  })

  describe('MailFetcherError', () => {
    it('should create error with type and message', () => {
      const error = new MailFetcherError(
        MailFetcherErrorType.CONNECTION_FAILED,
        'Failed to connect to server'
      )

      expect(error.type).toBe(MailFetcherErrorType.CONNECTION_FAILED)
      expect(error.message).toBe('Failed to connect to server')
      expect(error.name).toBe('MailFetcherError')
    })

    it('should create error with identifier', () => {
      const error = new MailFetcherError(
        MailFetcherErrorType.FETCH_FAILED,
        'Failed to fetch email',
        { uid: 12345 }
      )

      expect(error.identifier).toEqual({ uid: 12345 })
    })

    it('should create error with cause', () => {
      const cause = new Error('Network timeout')
      const error = new MailFetcherError(
        MailFetcherErrorType.FETCH_FAILED,
        'Failed to fetch email',
        { uidl: 'unique-123' },
        cause
      )

      expect(error.cause).toBe(cause)
    })

    it('should support all error types', () => {
      const errorTypes = [
        MailFetcherErrorType.CONNECTION_FAILED,
        MailFetcherErrorType.AUTHENTICATION_FAILED,
        MailFetcherErrorType.FETCH_FAILED,
        MailFetcherErrorType.PARSE_FAILED,
        MailFetcherErrorType.PROTOCOL_NOT_SUPPORTED,
      ]

      errorTypes.forEach((type) => {
        const error = new MailFetcherError(type, 'Test error')
        expect(error.type).toBe(type)
      })
    })

    it('should be instanceof Error', () => {
      const error = new MailFetcherError(
        MailFetcherErrorType.FETCH_FAILED,
        'Test error'
      )

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(MailFetcherError)
    })
  })
})
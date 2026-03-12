import { describe, it, expect } from 'vitest'
import type {
  IMailFetcher,
  ConnectionTestResult,
} from './IMailFetcher.interface'
import type { FetchedEmail, EmailIdentifier } from '../types/mail-fetcher.types'

/**
 * Mock implementation for testing interface contract
 */
class MockMailFetcher implements IMailFetcher {
  readonly protocolType = 'IMAP' as const

  async connect(): Promise<void> {
    // Mock implementation
  }

  async disconnect(): Promise<void> {
    // Mock implementation
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return { success: true }
  }

  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    // Yield a test email
    yield {
      uid: 1,
      subject: 'Test',
      from: 'test@example.com',
      date: new Date(),
      rawContent: 'Content',
      hasAttachments: false,
    }
  }

  async markAsRead(identifier: EmailIdentifier): Promise<void> {
    // Mock implementation
  }

  async moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void> {
    // Mock implementation
  }

  async deleteMessage(identifier: EmailIdentifier): Promise<void> {
    // Mock implementation
  }
}

/**
 * POP3 mock implementation demonstrating graceful degradation
 */
class MockPop3Fetcher implements IMailFetcher {
  readonly protocolType = 'POP3' as const

  async connect(): Promise<void> {
    // Mock implementation
  }

  async disconnect(): Promise<void> {
    // Mock implementation
  }

  async testConnection(): Promise<ConnectionTestResult> {
    return { success: true }
  }

  async *fetchNewEmails(): AsyncGenerator<FetchedEmail, void, unknown> {
    // Yield a test email with uidl
    yield {
      uidl: 'unique-idl-123',
      subject: 'Test',
      from: 'test@example.com',
      date: new Date(),
      rawContent: 'Content',
      hasAttachments: false,
    }
  }

  async markAsRead(identifier: EmailIdentifier): Promise<void> {
    // POP3 graceful degradation - no-op
  }

  async moveToFolder(identifier: EmailIdentifier, folder: string): Promise<void> {
    // POP3 graceful degradation - no-op
  }

  async deleteMessage(identifier: EmailIdentifier): Promise<void> {
    // POP3 supports DELE command
  }
}

describe('IMailFetcher interface', () => {
  describe('IMAP implementation', () => {
    it('should implement IMailFetcher interface', () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      expect(fetcher.protocolType).toBe('IMAP')
    })

    it('should have connect method', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      await expect(fetcher.connect()).resolves.toBeUndefined()
    })

    it('should have disconnect method', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      await expect(fetcher.disconnect()).resolves.toBeUndefined()
    })

    it('should have testConnection method returning ConnectionTestResult', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      const result = await fetcher.testConnection()

      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')
    })

    it('should have fetchNewEmails returning AsyncGenerator', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      const generator = fetcher.fetchNewEmails()

      expect(generator).toBeDefined()
      expect(typeof generator.next).toBe('function')
      expect(typeof generator.return).toBe('function')
      expect(typeof generator.throw).toBe('function')
    })

    it('should yield emails from AsyncGenerator', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      const emails: FetchedEmail[] = []

      for await (const email of fetcher.fetchNewEmails()) {
        emails.push(email)
      }

      expect(emails).toHaveLength(1)
      expect(emails[0].uid).toBe(1)
    })

    it('should have markAsRead method', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      await expect(fetcher.markAsRead({ uid: 1 })).resolves.toBeUndefined()
    })

    it('should have moveToFolder method', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      await expect(fetcher.moveToFolder({ uid: 1 }, 'Archive')).resolves.toBeUndefined()
    })

    it('should have deleteMessage method', async () => {
      const fetcher: IMailFetcher = new MockMailFetcher()
      await expect(fetcher.deleteMessage({ uid: 1 })).resolves.toBeUndefined()
    })
  })

  describe('POP3 implementation', () => {
    it('should implement IMailFetcher interface with POP3 protocol type', () => {
      const fetcher: IMailFetcher = new MockPop3Fetcher()
      expect(fetcher.protocolType).toBe('POP3')
    })

    it('should yield POP3 emails with uidl', async () => {
      const fetcher: IMailFetcher = new MockPop3Fetcher()
      const emails: FetchedEmail[] = []

      for await (const email of fetcher.fetchNewEmails()) {
        emails.push(email)
      }

      expect(emails).toHaveLength(1)
      expect(emails[0].uidl).toBe('unique-idl-123')
      expect('uid' in emails[0]).toBe(false)
    })

    it('should gracefully handle markAsRead (no-op for POP3)', async () => {
      const fetcher: IMailFetcher = new MockPop3Fetcher()
      // Should not throw, even though POP3 doesn't support marking as read
      await expect(fetcher.markAsRead({ uidl: 'test-uidl' })).resolves.toBeUndefined()
    })

    it('should gracefully handle moveToFolder (no-op for POP3)', async () => {
      const fetcher: IMailFetcher = new MockPop3Fetcher()
      // Should not throw, even though POP3 doesn't support folders
      await expect(fetcher.moveToFolder({ uidl: 'test-uidl' }, 'Archive')).resolves.toBeUndefined()
    })
  })

  describe('ConnectionTestResult', () => {
    it('should have success property', () => {
      const result: ConnectionTestResult = { success: true }
      expect(result.success).toBe(true)
    })

    it('should have optional error property', () => {
      const result: ConnectionTestResult = { success: false, error: 'Connection refused' }
      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection refused')
    })

    it('should allow error to be undefined when success is true', () => {
      const result: ConnectionTestResult = { success: true }
      expect(result.error).toBeUndefined()
    })
  })
})
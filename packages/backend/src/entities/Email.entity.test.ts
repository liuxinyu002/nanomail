import { describe, it, expect } from 'vitest'
import { Email } from './Email.entity'
import { validate } from 'class-validator'

describe('Email Entity - Thread Context Fields', () => {
  describe('message_id field', () => {
    it('should have message_id field', () => {
      const email = new Email()
      email.message_id = '<test-message-id@example.com>'
      expect(email.message_id).toBe('<test-message-id@example.com>')
    })

    it('should allow null message_id', () => {
      const email = new Email()
      email.message_id = null
      expect(email.message_id).toBeNull()
    })

    it('should be optional (undefined)', () => {
      const email = new Email()
      expect(email.message_id).toBeUndefined()
    })
  })

  describe('in_reply_to field', () => {
    it('should have in_reply_to field', () => {
      const email = new Email()
      email.in_reply_to = '<parent-message-id@example.com>'
      expect(email.in_reply_to).toBe('<parent-message-id@example.com>')
    })

    it('should allow null in_reply_to', () => {
      const email = new Email()
      email.in_reply_to = null
      expect(email.in_reply_to).toBeNull()
    })

    it('should be optional (undefined)', () => {
      const email = new Email()
      expect(email.in_reply_to).toBeUndefined()
    })
  })

  describe('references field', () => {
    it('should have references field as JSON array', () => {
      const email = new Email()
      email.references = ['<msg1@example.com>', '<msg2@example.com>']
      expect(email.references).toEqual(['<msg1@example.com>', '<msg2@example.com>'])
    })

    it('should allow null references', () => {
      const email = new Email()
      email.references = null
      expect(email.references).toBeNull()
    })

    it('should allow empty array', () => {
      const email = new Email()
      email.references = []
      expect(email.references).toEqual([])
    })

    it('should be optional (undefined)', () => {
      const email = new Email()
      expect(email.references).toBeUndefined()
    })
  })

  describe('uid field', () => {
    it('should have uid field for IMAP sync tracking', () => {
      const email = new Email()
      email.uid = 12345
      expect(email.uid).toBe(12345)
    })

    it('should allow null uid', () => {
      const email = new Email()
      email.uid = null
      expect(email.uid).toBeNull()
    })

    it('should be optional (undefined)', () => {
      const email = new Email()
      expect(email.uid).toBeUndefined()
    })
  })

  describe('process_status field', () => {
    it('should have process_status field', () => {
      const email = new Email()
      email.process_status = 'PENDING'
      expect(email.process_status).toBe('PENDING')
    })

    it('should default to PENDING', () => {
      const email = new Email()
      expect(email.process_status).toBe('PENDING')
    })

    it('should accept QUEUED status', () => {
      const email = new Email()
      email.process_status = 'QUEUED'
      expect(email.process_status).toBe('QUEUED')
    })

    it('should accept PROCESSED status', () => {
      const email = new Email()
      email.process_status = 'PROCESSED'
      expect(email.process_status).toBe('PROCESSED')
    })

    it('should accept FAILED status', () => {
      const email = new Email()
      email.process_status = 'FAILED'
      expect(email.process_status).toBe('FAILED')
    })
  })

  describe('existing fields', () => {
    it('should maintain all existing fields', () => {
      const email = new Email()
      email.id = 1
      email.subject = 'Test Subject'
      email.sender = 'sender@example.com'
      email.snippet = 'Test snippet'
      email.bodyText = 'Full body text'
      email.summary = 'AI summary'
      email.hasAttachments = true
      email.date = new Date('2024-01-15')
      email.isProcessed = false
      email.isSpam = false

      expect(email.id).toBe(1)
      expect(email.subject).toBe('Test Subject')
      expect(email.sender).toBe('sender@example.com')
      expect(email.snippet).toBe('Test snippet')
      expect(email.bodyText).toBe('Full body text')
      expect(email.summary).toBe('AI summary')
      expect(email.hasAttachments).toBe(true)
      expect(email.date).toEqual(new Date('2024-01-15'))
      expect(email.isProcessed).toBe(false)
      expect(email.isSpam).toBe(false)
    })
  })
})
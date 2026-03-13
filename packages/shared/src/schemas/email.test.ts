import { describe, it, expect } from 'vitest'
import {
  EmailClassificationSchema,
  EmailSchema,
  EmailListItemSchema,
  CreateEmailSchema,
  type EmailClassification
} from './email'

describe('Email Schemas', () => {
  describe('EmailClassificationSchema', () => {
    it('should accept IMPORTANT', () => {
      expect(EmailClassificationSchema.parse('IMPORTANT')).toBe('IMPORTANT')
    })

    it('should accept NEWSLETTER', () => {
      expect(EmailClassificationSchema.parse('NEWSLETTER')).toBe('NEWSLETTER')
    })

    it('should accept SPAM', () => {
      expect(EmailClassificationSchema.parse('SPAM')).toBe('SPAM')
    })

    it('should reject invalid classification', () => {
      expect(() => EmailClassificationSchema.parse('INVALID')).toThrow()
    })
  })

  describe('EmailSchema', () => {
    const validEmail = {
      id: 1,
      subject: 'Test Subject',
      sender: 'test@example.com',
      snippet: 'Test snippet',
      bodyText: 'Full body text',
      hasAttachments: false,
      date: '2024-01-15T10:00:00Z',
      isProcessed: false,
      classification: 'IMPORTANT' as EmailClassification,
      summary: 'AI summary'
    }

    it('should parse valid email with classification', () => {
      const result = EmailSchema.parse(validEmail)
      expect(result.classification).toBe('IMPORTANT')
    })

    it('should accept SPAM classification', () => {
      const result = EmailSchema.parse({ ...validEmail, classification: 'SPAM' })
      expect(result.classification).toBe('SPAM')
    })

    it('should accept NEWSLETTER classification', () => {
      const result = EmailSchema.parse({ ...validEmail, classification: 'NEWSLETTER' })
      expect(result.classification).toBe('NEWSLETTER')
    })

    it('should allow nullable summary', () => {
      const result = EmailSchema.parse({ ...validEmail, summary: null })
      expect(result.summary).toBeNull()
    })

    it('should coerce date string to Date object', () => {
      const result = EmailSchema.parse(validEmail)
      expect(result.date).toBeInstanceOf(Date)
    })
  })

  describe('EmailListItemSchema', () => {
    const validListItem = {
      id: 1,
      subject: 'Test Subject',
      sender: 'test@example.com',
      snippet: 'Test snippet',
      bodyText: 'Full body text',
      hasAttachments: false,
      date: '2024-01-15T10:00:00Z',
      isProcessed: false,
      classification: 'SPAM' as EmailClassification,
      summary: 'AI summary',
      isSpam: true
    }

    it('should include isSpam field (computed from classification)', () => {
      const result = EmailListItemSchema.parse(validListItem)
      expect(result.isSpam).toBe(true)
    })

    it('should have isSpam false for IMPORTANT', () => {
      const result = EmailListItemSchema.parse({
        ...validListItem,
        classification: 'IMPORTANT',
        isSpam: false
      })
      expect(result.isSpam).toBe(false)
    })

    it('should have isSpam false for NEWSLETTER', () => {
      const result = EmailListItemSchema.parse({
        ...validListItem,
        classification: 'NEWSLETTER',
        isSpam: false
      })
      expect(result.isSpam).toBe(false)
    })
  })

  describe('CreateEmailSchema', () => {
    const validCreate = {
      subject: 'Test Subject',
      sender: 'test@example.com',
      snippet: 'Test snippet',
      bodyText: 'Full body text',
      hasAttachments: false,
      date: '2024-01-15T10:00:00Z'
    }

    it('should default classification to IMPORTANT', () => {
      const result = CreateEmailSchema.parse(validCreate)
      expect(result.classification).toBe('IMPORTANT')
    })

    it('should default isProcessed to false', () => {
      const result = CreateEmailSchema.parse(validCreate)
      expect(result.isProcessed).toBe(false)
    })

    it('should allow nullable summary', () => {
      const result = CreateEmailSchema.parse({ ...validCreate, summary: null })
      expect(result.summary).toBeNull()
    })

    it('should allow explicit classification', () => {
      const result = CreateEmailSchema.parse({ ...validCreate, classification: 'SPAM' })
      expect(result.classification).toBe('SPAM')
    })
  })
})
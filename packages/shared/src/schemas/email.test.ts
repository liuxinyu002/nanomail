import { describe, it, expect } from 'vitest'
import {
  EmailClassificationSchema,
  EmailSchema,
  EmailListItemSchema,
  CreateEmailSchema,
  SendEmailSchema,
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

  describe('SendEmailSchema', () => {
    const validSendEmail = {
      to: ['recipient@example.com'],
      subject: 'Test Subject',
      body: 'Test body content'
    }

    describe('to field (required array)', () => {
      it('should accept single recipient in array', () => {
        const result = SendEmailSchema.parse(validSendEmail)
        expect(result.to).toEqual(['recipient@example.com'])
      })

      it('should accept multiple recipients in array', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          to: ['one@example.com', 'two@example.com', 'three@example.com']
        })
        expect(result.to).toHaveLength(3)
        expect(result.to).toContain('one@example.com')
      })

      it('should reject empty to array', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          to: []
        })).toThrow()
      })

      it('should reject invalid email in to array', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          to: ['invalid-email']
        })).toThrow()
      })

      it('should reject to as string (must be array)', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          to: 'recipient@example.com'
        })).toThrow()
      })
    })

    describe('cc field (optional array)', () => {
      it('should accept empty cc array', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          cc: []
        })
        expect(result.cc).toEqual([])
      })

      it('should accept multiple cc recipients', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          cc: ['cc1@example.com', 'cc2@example.com']
        })
        expect(result.cc).toHaveLength(2)
      })

      it('should default cc to empty array when omitted', () => {
        const result = SendEmailSchema.parse(validSendEmail)
        expect(result.cc).toEqual([])
      })

      it('should treat undefined as empty array (default)', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          cc: undefined
        })
        expect(result.cc).toEqual([])
      })

      it('should reject invalid email in cc array', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          cc: ['invalid-email']
        })).toThrow()
      })
    })

    describe('bcc field (optional array)', () => {
      it('should accept empty bcc array', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          bcc: []
        })
        expect(result.bcc).toEqual([])
      })

      it('should accept multiple bcc recipients', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          bcc: ['bcc1@example.com', 'bcc2@example.com']
        })
        expect(result.bcc).toHaveLength(2)
      })

      it('should default bcc to empty array when omitted', () => {
        const result = SendEmailSchema.parse(validSendEmail)
        expect(result.bcc).toEqual([])
      })

      it('should treat undefined as empty array (default)', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          bcc: undefined
        })
        expect(result.bcc).toEqual([])
      })

      it('should reject invalid email in bcc array', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          bcc: ['invalid-email']
        })).toThrow()
      })
    })

    describe('subject field', () => {
      it('should reject empty subject', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          subject: ''
        })).toThrow()
      })

      it('should accept subject up to 500 characters', () => {
        const longSubject = 'a'.repeat(500)
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          subject: longSubject
        })
        expect(result.subject).toBe(longSubject)
      })

      it('should reject subject over 500 characters', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          subject: 'a'.repeat(501)
        })).toThrow()
      })
    })

    describe('body field', () => {
      it('should reject empty body', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          body: ''
        })).toThrow()
      })
    })

    describe('replyTo field (optional)', () => {
      it('should accept valid replyTo email', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          replyTo: 'reply@example.com'
        })
        expect(result.replyTo).toBe('reply@example.com')
      })

      it('should allow undefined replyTo', () => {
        const result = SendEmailSchema.parse(validSendEmail)
        expect(result.replyTo).toBeUndefined()
      })

      it('should reject invalid replyTo email', () => {
        expect(() => SendEmailSchema.parse({
          ...validSendEmail,
          replyTo: 'invalid-email'
        })).toThrow()
      })
    })

    describe('isHtml field (optional)', () => {
      it('should default isHtml to true', () => {
        const result = SendEmailSchema.parse(validSendEmail)
        expect(result.isHtml).toBe(true)
      })

      it('should accept explicit isHtml false', () => {
        const result = SendEmailSchema.parse({
          ...validSendEmail,
          isHtml: false
        })
        expect(result.isHtml).toBe(false)
      })
    })
  })
})
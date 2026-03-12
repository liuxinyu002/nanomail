import { describe, it, expect } from 'vitest'
import { MailParserService, type ParsedEmail } from './MailParserService'

describe('MailParserService - Thread Context Extraction', () => {
  const service = new MailParserService()

  describe('parse - Thread Headers', () => {
    it('should extract Message-ID header', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Test Subject
Message-ID: <unique-message-id@example.com>
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

This is the email body.`

      const result = await service.parse(rawEmail)

      expect(result.messageId).toBe('<unique-message-id@example.com>')
    })

    it('should extract In-Reply-To header', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Re: Test Subject
Message-ID: <reply-message-id@example.com>
In-Reply-To: <original-message-id@example.com>
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

This is a reply.`

      const result = await service.parse(rawEmail)

      expect(result.inReplyTo).toBe('<original-message-id@example.com>')
    })

    it('should extract References header as array', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Re: Re: Test Subject
Message-ID: <third-message-id@example.com>
In-Reply-To: <second-message-id@example.com>
References: <first-message-id@example.com> <second-message-id@example.com>
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

This is a reply to a reply.`

      const result = await service.parse(rawEmail)

      expect(result.references).toBeDefined()
      expect(result.references).toContain('<first-message-id@example.com>')
      expect(result.references).toContain('<second-message-id@example.com>')
    })

    it('should handle missing Message-ID gracefully', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: No Message-ID
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.messageId).toBeNull()
    })

    it('should handle missing In-Reply-To gracefully', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Not a reply
Message-ID: <standalone-message-id@example.com>
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

This is not a reply.`

      const result = await service.parse(rawEmail)

      expect(result.inReplyTo).toBeNull()
    })

    it('should handle missing References gracefully', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: First email
Message-ID: <first-message-id@example.com>
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

This is the first email.`

      const result = await service.parse(rawEmail)

      expect(result.references).toBeNull()
    })

    it('should extract all thread context headers together', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Re: Thread Test
Message-ID: <current@example.com>
In-Reply-To: <parent@example.com>
References: <grandparent@example.com> <parent@example.com>
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Thread reply.`

      const result = await service.parse(rawEmail)

      expect(result.messageId).toBe('<current@example.com>')
      expect(result.inReplyTo).toBe('<parent@example.com>')
      expect(result.references).toContain('<grandparent@example.com>')
      expect(result.references).toContain('<parent@example.com>')
    })
  })

  describe('from field extraction', () => {
    it('should extract clean email address from from field', async () => {
      const rawEmail = `From: John Doe <john.doe@example.com>
To: recipient@example.com
Subject: Test
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.from).toBe('john.doe@example.com')
    })

    it('should handle simple email address in from field', async () => {
      const rawEmail = `From: simple@example.com
To: recipient@example.com
Subject: Test
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.from).toBe('simple@example.com')
    })

    it('should handle quoted name in from field', async () => {
      const rawEmail = `From: "Doe, John" <john.doe@example.com>
To: recipient@example.com
Subject: Test
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.from).toBe('john.doe@example.com')
    })

    it('should return null for missing from field', async () => {
      const rawEmail = `To: recipient@example.com
Subject: No From
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.from).toBeNull()
    })
  })

  describe('existing functionality', () => {
    it('should still extract subject, text, date, and attachments', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Full Email Test
Message-ID: <test@example.com>
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

This is the email body text.`

      const result = await service.parse(rawEmail)

      expect(result.subject).toBe('Full Email Test')
      expect(result.text).toContain('This is the email body text.')
      expect(result.date).not.toBeNull()
      expect(result.hasAttachments).toBe(false)
    })
  })
})
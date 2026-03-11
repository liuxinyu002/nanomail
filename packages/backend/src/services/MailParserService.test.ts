import { describe, it, expect } from 'vitest'
import { MailParserService, type ParsedEmail } from './MailParserService'

describe('MailParserService', () => {
  const service = new MailParserService()

  describe('parse', () => {
    it('should parse a simple email with subject, from, and text body', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Test Subject
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

This is the email body text.
It has multiple lines.`

      const result = await service.parse(rawEmail)

      expect(result.subject).toBe('Test Subject')
      expect(result.from).toBe('sender@example.com')
      expect(result.text).toContain('This is the email body text.')
      expect(result.hasAttachments).toBe(false)
    })

    it('should handle multipart messages with text and html', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Multipart Email
Date: Mon, 15 Jan 2024 10:00:00 +0000
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset=utf-8

Plain text content

--boundary123
Content-Type: text/html; charset=utf-8

<html><body>HTML content</body></html>

--boundary123--`

      const result = await service.parse(rawEmail)

      expect(result.subject).toBe('Multipart Email')
      expect(result.text).toContain('Plain text content')
      expect(result.html).toContain('HTML content')
    })

    it('should detect attachments', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Subject: Email with attachment
Date: Mon, 15 Jan 2024 10:00:00 +0000
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary456"

--boundary456
Content-Type: text/plain; charset=utf-8

Email body

--boundary456
Content-Type: application/pdf; name="document.pdf"
Content-Disposition: attachment; filename="document.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQK

--boundary456--`

      const result = await service.parse(rawEmail)

      expect(result.hasAttachments).toBe(true)
    })

    it('should handle missing subject gracefully', async () => {
      const rawEmail = `From: sender@example.com
To: recipient@example.com
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.subject).toBeNull()
    })

    it('should handle missing from address gracefully', async () => {
      const rawEmail = `To: recipient@example.com
Subject: No From
Date: Mon, 15 Jan 2024 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.from).toBeNull()
    })

    it('should handle Buffer input', async () => {
      const rawEmail = Buffer.from(`From: sender@example.com
Subject: Buffer Test
Content-Type: text/plain; charset=utf-8

Email body`)

      const result = await service.parse(rawEmail)

      expect(result.subject).toBe('Buffer Test')
    })

    it('should parse date correctly', async () => {
      const rawEmail = `From: sender@example.com
Subject: Date Test
Date: Mon, 15 Jan 2024 10:30:00 +0000
Content-Type: text/plain; charset=utf-8

Email body`

      const result = await service.parse(rawEmail)

      expect(result.date).not.toBeNull()
      expect(result.date?.getFullYear()).toBe(2024)
    })
  })

  describe('extractText', () => {
    it('should return plain text when available', () => {
      const parsed: ParsedEmail = {
        subject: 'Test',
        from: 'test@test.com',
        text: 'Plain text content',
        html: '<html>HTML content</html>',
        date: new Date(),
        hasAttachments: false,
      }

      const text = service.extractText(parsed)

      expect(text).toBe('Plain text content')
    })

    it('should return HTML stripped of tags when no plain text', () => {
      const parsed: ParsedEmail = {
        subject: 'Test',
        from: 'test@test.com',
        text: null,
        html: '<html><body>HTML content</body></html>',
        date: new Date(),
        hasAttachments: false,
      }

      const text = service.extractText(parsed)

      expect(text).toContain('HTML content')
      expect(text).not.toContain('<html>')
    })

    it('should return empty string when no text or html', () => {
      const parsed: ParsedEmail = {
        subject: 'Test',
        from: 'test@test.com',
        text: null,
        html: null,
        date: new Date(),
        hasAttachments: false,
      }

      const text = service.extractText(parsed)

      expect(text).toBe('')
    })
  })

  describe('createSnippet', () => {
    it('should truncate text to 200 characters', () => {
      const longText = 'a'.repeat(300)
      const snippet = service.createSnippet(longText)

      expect(snippet.length).toBeLessThanOrEqual(200)
    })

    it('should return full text if under 200 characters', () => {
      const shortText = 'Short text'
      const snippet = service.createSnippet(shortText)

      expect(snippet).toBe('Short text')
    })

    it('should return empty string for null input', () => {
      const snippet = service.createSnippet(null)

      expect(snippet).toBe('')
    })

    it('should handle empty string', () => {
      const snippet = service.createSnippet('')

      expect(snippet).toBe('')
    })
  })
})
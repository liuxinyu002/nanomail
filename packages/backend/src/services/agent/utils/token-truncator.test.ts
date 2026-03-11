/**
 * Tests for TokenTruncator utility
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TokenTruncator } from './token-truncator'

describe('TokenTruncator', () => {
  let truncator: TokenTruncator

  beforeEach(() => {
    truncator = new TokenTruncator()
  })

  describe('estimateTokens', () => {
    it('should estimate tokens for English text', () => {
      // "Hello world" = 11 chars ≈ 3 tokens
      const tokens = truncator.estimateTokens('Hello world')
      expect(tokens).toBeGreaterThanOrEqual(2)
      expect(tokens).toBeLessThanOrEqual(4)
    })

    it('should return at least 1 token for non-empty text', () => {
      expect(truncator.estimateTokens('a')).toBe(1)
    })

    it('should return 0 for empty text', () => {
      expect(truncator.estimateTokens('')).toBe(0)
    })

    it('should estimate higher for longer text', () => {
      const shortText = 'Hello world'
      const longText = 'Hello world '.repeat(100)

      expect(truncator.estimateTokens(longText)).toBeGreaterThan(
        truncator.estimateTokens(shortText)
      )
    })

    it('should estimate approximately 1 token per 4 characters', () => {
      const text = 'a'.repeat(100) // 100 chars ≈ 25 tokens
      const tokens = truncator.estimateTokens(text)
      expect(tokens).toBeGreaterThanOrEqual(20)
      expect(tokens).toBeLessThanOrEqual(30)
    })
  })

  describe('truncate', () => {
    it('should not truncate text within limit', () => {
      const text = 'Hello world'
      const result = truncator.truncate(text, 100)

      expect(result.text).toBe(text)
      expect(result.wasTruncated).toBe(false)
      expect(result.originalTokens).toBe(truncator.estimateTokens(text))
    })

    it('should truncate text exceeding limit', () => {
      const text = 'a'.repeat(1000) // 250 tokens
      const result = truncator.truncate(text, 50)

      expect(result.wasTruncated).toBe(true)
      expect(result.originalTokens).toBeGreaterThan(50)
    })

    it('should include truncation notice', () => {
      const text = 'a'.repeat(1000)
      const result = truncator.truncate(text, 50)

      expect(result.text).toContain('truncated')
    })

    it('should preserve beginning of text (70%)', () => {
      const text = 'START' + 'a'.repeat(500) + 'END'
      const result = truncator.truncate(text, 100)

      expect(result.text).toContain('START')
    })

    it('should preserve end of text (30%)', () => {
      const text = 'START' + 'a'.repeat(500) + 'END'
      const result = truncator.truncate(text, 100)

      expect(result.text).toContain('END')
    })

    it('should handle very short max tokens', () => {
      const text = 'This is a long text that needs truncation'
      const result = truncator.truncate(text, 10)

      expect(result.wasTruncated).toBe(true)
      // Result tokens should be close to limit (with some buffer for truncation notice)
      expect(truncator.estimateTokens(result.text)).toBeLessThanOrEqual(15)
    })
  })

  describe('truncateWithStrategy', () => {
    it('should preserve headers when option set', () => {
      const text = 'From: sender@example.com\nTo: recipient@example.com\n\nBody content here that is quite long and needs to be truncated...'
      const result = truncator.truncateWithStrategy(text, 30, {
        preserveHeaders: true
      })

      expect(result.text).toContain('From:')
      expect(result.text).toContain('To:')
    })

    it('should preserve signature when option set', () => {
      const text = 'Body content that is long enough to need truncation...\n\n--\nBest regards,\nJohn Doe\nSignature here'
      const result = truncator.truncateWithStrategy(text, 30, {
        preserveSignature: true
      })

      expect(result.text).toContain('Best regards')
    })
  })

  describe('chunkText', () => {
    it('should split text into chunks', () => {
      const text = 'a '.repeat(200) // 400 chars ≈ 100 tokens
      const chunks = truncator.chunkText(text, 30)

      expect(chunks.length).toBeGreaterThan(1)
      for (const chunk of chunks) {
        expect(truncator.estimateTokens(chunk)).toBeLessThanOrEqual(35)
      }
    })

    it('should return single chunk for short text', () => {
      const text = 'Short text'
      const chunks = truncator.chunkText(text, 100)

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toBe(text)
    })

    it('should preserve chunk boundaries at word boundaries', () => {
      const text = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10'
      const chunks = truncator.chunkText(text, 5) // Very small chunks

      // Each chunk should be trimmed
      for (const chunk of chunks) {
        expect(chunk.trim()).toBe(chunk)
      }
    })
  })
})
import { describe, it, expect } from 'vitest'
import {
  truncate,
  formatToolArgs,
  formatToolResult,
  withStep,
  agentPrefix,
  TRUNCATE_PRESETS
} from './logger-utils'

describe('LoggerUtils', () => {
  describe('truncate', () => {
    it('should return content as-is if under max length', () => {
      const result = truncate('short', TRUNCATE_PRESETS.THOUGHT)
      expect(result).toBe('short')
    })

    it('should truncate with BOTH mode (head + tail)', () => {
      const longContent = 'a'.repeat(300)
      const result = truncate(longContent, TRUNCATE_PRESETS.THOUGHT, 'BOTH')
      expect(result).toContain('...[truncated]...')
      // Head + marker + tail
      expect(result.length).toBeLessThanOrEqual(
        TRUNCATE_PRESETS.THOUGHT.headLength +
        TRUNCATE_PRESETS.THOUGHT.tailLength +
        20 // marker length
      )
    })

    it('should truncate with HEAD mode only', () => {
      const longContent = 'a'.repeat(300)
      const result = truncate(longContent, TRUNCATE_PRESETS.THOUGHT, 'HEAD')
      expect(result).toMatch(/^a{50}\.\.\./)
    })

    it('should handle empty content', () => {
      expect(truncate('', TRUNCATE_PRESETS.THOUGHT)).toBe('(empty)')
    })

    it('should use BOTH as default mode', () => {
      const longContent = 'a'.repeat(300)
      const result = truncate(longContent, TRUNCATE_PRESETS.THOUGHT)
      expect(result).toContain('...[truncated]...')
    })

    it('should use custom marker when provided', () => {
      const customOptions = { maxLength: 100, headLength: 20, tailLength: 20, marker: '---' }
      const longContent = 'a'.repeat(200)
      const result = truncate(longContent, customOptions, 'BOTH')
      expect(result).toContain('---')
    })

    it('should handle content exactly at maxLength', () => {
      const content = 'a'.repeat(200) // maxLength for THOUGHT
      const result = truncate(content, TRUNCATE_PRESETS.THOUGHT)
      expect(result).toBe(content)
    })
  })

  describe('formatToolArgs', () => {
    it('should format with keys', () => {
      const result = formatToolArgs('search-emails', { query: 'test', limit: 10 })
      expect(result).toBe('Call search-emails with keys: [query, limit]')
    })

    it('should format with no args', () => {
      const result = formatToolArgs('get-time', {})
      expect(result).toBe('Call get-time (no args)')
    })

    it('should handle single arg', () => {
      const result = formatToolArgs('mark-read', { emailId: 123 })
      expect(result).toBe('Call mark-read with keys: [emailId]')
    })
  })

  describe('formatToolResult', () => {
    it('should handle null', () => {
      expect(formatToolResult(null)).toBe('(empty)')
    })

    it('should handle undefined', () => {
      expect(formatToolResult(undefined)).toBe('(empty)')
    })

    it('should handle Error objects', () => {
      const result = formatToolResult(new Error('test error'))
      expect(result).toBe('Error: test error')
    })

    it('should handle non-string types (object)', () => {
      const result = formatToolResult({ key: 'value' })
      expect(result).toBe('{"key":"value"}')
    })

    it('should handle non-string types (array)', () => {
      const result = formatToolResult([1, 2, 3])
      expect(result).toBe('[1,2,3]')
    })

    it('should truncate long results with byte size annotation', () => {
      const longResult = 'x'.repeat(500)
      const result = formatToolResult(longResult)
      expect(result).toContain('...')
      expect(result).toContain('(Total:')
      expect(result).toContain('bytes)')
    })

    it('should not truncate short results', () => {
      const shortResult = 'short result'
      const result = formatToolResult(shortResult)
      expect(result).toBe('short result')
      expect(result).not.toContain('Total')
    })

    it('should calculate correct byte size for UTF-8 characters', () => {
      // Chinese characters are 3 bytes each in UTF-8
      const chineseResult = '你好世界' // 12 bytes
      const result = formatToolResult(chineseResult)
      // Should not be truncated (under maxLength), so no byte annotation
      expect(result).toBe('你好世界')
    })

    it('should calculate byte size for long UTF-8 content', () => {
      // Create content that exceeds maxLength
      const longChinese = '你好'.repeat(150) // 900 bytes
      const result = formatToolResult(longChinese)
      expect(result).toContain('(Total:')
      expect(result).toContain('900 bytes)')
    })
  })

  describe('withStep', () => {
    it('should create step prefix', () => {
      expect(withStep(1)).toBe('[Step 1]')
      expect(withStep(5)).toBe('[Step 5]')
    })
  })

  describe('agentPrefix', () => {
    it('should create prefix without step', () => {
      expect(agentPrefix('Loop')).toBe('[Agent] [Loop]')
    })

    it('should create prefix with step', () => {
      expect(agentPrefix('Loop', 1)).toBe('[Agent] [Loop] [Step 1]')
    })

    it('should handle different modules', () => {
      expect(agentPrefix('Tool')).toBe('[Agent] [Tool]')
      expect(agentPrefix('Context')).toBe('[Agent] [Context]')
    })
  })

  describe('TRUNCATE_PRESETS', () => {
    it('should have THOUGHT preset with correct shape', () => {
      expect(TRUNCATE_PRESETS.THOUGHT).toHaveProperty('maxLength')
      expect(TRUNCATE_PRESETS.THOUGHT).toHaveProperty('headLength')
      expect(TRUNCATE_PRESETS.THOUGHT).toHaveProperty('tailLength')
    })

    it('should have TOOL_ARGS preset', () => {
      expect(TRUNCATE_PRESETS.TOOL_ARGS).toBeDefined()
    })

    it('should have TOOL_RESULT preset', () => {
      expect(TRUNCATE_PRESETS.TOOL_RESULT).toBeDefined()
    })

    it('should have LLM_RESPONSE preset', () => {
      expect(TRUNCATE_PRESETS.LLM_RESPONSE).toBeDefined()
    })
  })
})
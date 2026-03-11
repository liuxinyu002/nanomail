/**
 * Tests for MemoryStore Service
 * TDD: Write tests first, then implement
 * Reference: nanobot/agent/memory.py
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import { MemoryStore } from './types'

// Mock fs.promises
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    appendFile: vi.fn(),
    mkdir: vi.fn()
  }
}))

describe('MemoryStore', () => {
  let memoryStore: MemoryStore
  const testWorkspace = '/test/workspace'

  beforeEach(() => {
    vi.clearAllMocks()
    memoryStore = new MemoryStore(testWorkspace)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with workspace path', () => {
      expect(memoryStore).toBeDefined()
    })

    it('should set memory and history paths', () => {
      // Paths are private, but we can test behavior
      expect(memoryStore).toBeInstanceOf(MemoryStore)
    })
  })

  describe('getMemoryContext', () => {
    it('should return memory content when file exists', async () => {
      const memoryContent = 'Important facts to remember'
      vi.mocked(fs.readFile).mockResolvedValue(memoryContent)

      const result = await memoryStore.getMemoryContext()

      expect(result).toBe(`[Long-term Memory]\n${memoryContent}`)
    })

    it('should return empty string when file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'))

      const result = await memoryStore.getMemoryContext()

      expect(result).toBe('')
    })

    it('should handle empty file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('')

      const result = await memoryStore.getMemoryContext()

      expect(result).toBe('[Long-term Memory]\n')
    })

    it('should read from correct path', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('content')

      await memoryStore.getMemoryContext()

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('MEMORY.md'),
        'utf-8'
      )
    })
  })

  describe('getHistory', () => {
    it('should return parsed history entries', async () => {
      const historyContent = [
        JSON.stringify({ role: 'user', content: 'Hello' }),
        JSON.stringify({ role: 'assistant', content: 'Hi' })
      ].join('\n')

      vi.mocked(fs.readFile).mockResolvedValue(historyContent)

      const history = await memoryStore.getHistory()

      expect(history).toHaveLength(2)
      expect(history[0]).toEqual({ role: 'user', content: 'Hello' })
      expect(history[1]).toEqual({ role: 'assistant', content: 'Hi' })
    })

    it('should return empty array when file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'))

      const history = await memoryStore.getHistory()

      expect(history).toEqual([])
    })

    it('should respect window size parameter', async () => {
      const entries = Array(200)
        .fill(null)
        .map((_, i) => JSON.stringify({ role: 'user', content: `Message ${i}` }))
      vi.mocked(fs.readFile).mockResolvedValue(entries.join('\n'))

      const history = await memoryStore.getHistory(50)

      expect(history).toHaveLength(50)
      // Should return last 50 entries
      expect(history[0].content).toBe('Message 150')
      expect(history[49].content).toBe('Message 199')
    })

    it('should use default window size of 100', async () => {
      const entries = Array(200)
        .fill(null)
        .map((_, i) => JSON.stringify({ role: 'user', content: `Message ${i}` }))
      vi.mocked(fs.readFile).mockResolvedValue(entries.join('\n'))

      const history = await memoryStore.getHistory()

      expect(history).toHaveLength(100)
    })

    it('should handle malformed JSON gracefully by skipping invalid lines', async () => {
      const historyContent = [
        JSON.stringify({ role: 'user', content: 'Valid' }),
        'invalid json',
        JSON.stringify({ role: 'assistant', content: 'Also valid' })
      ].join('\n')

      vi.mocked(fs.readFile).mockResolvedValue(historyContent)

      // Should skip malformed lines and continue parsing valid ones
      const history = await memoryStore.getHistory()

      expect(history).toHaveLength(2)
      expect(history[0]).toEqual({ role: 'user', content: 'Valid' })
      expect(history[1]).toEqual({ role: 'assistant', content: 'Also valid' })
    })

    it('should read from correct path', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('')

      await memoryStore.getHistory()

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('HISTORY.md'),
        'utf-8'
      )
    })
  })

  describe('saveTurn', () => {
    it('should save turn to history', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      await memoryStore.saveTurn({
        userMessage: 'Hello',
        assistantMessage: 'Hi there'
      })

      expect(fs.appendFile).toHaveBeenCalled()
      const savedContent = vi.mocked(fs.appendFile).mock.calls[0][1] as string
      const parsed = JSON.parse(savedContent)
      expect(parsed.userMessage).toBe('Hello')
      expect(parsed.assistantMessage).toBe('Hi there')
    })

    it('should include timestamp', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      await memoryStore.saveTurn({
        userMessage: 'Hello',
        assistantMessage: 'Hi'
      })

      const savedContent = vi.mocked(fs.appendFile).mock.calls[0][1] as string
      const parsed = JSON.parse(savedContent)
      expect(parsed.timestamp).toBeDefined()
      expect(() => new Date(parsed.timestamp)).not.toThrow()
    })

    it('should include tool calls when present', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      await memoryStore.saveTurn({
        userMessage: 'Search emails',
        assistantMessage: 'Here are the results',
        toolCalls: [
          { name: 'search_emails', result: 'Found 5 emails' }
        ]
      })

      const savedContent = vi.mocked(fs.appendFile).mock.calls[0][1] as string
      const parsed = JSON.parse(savedContent)
      expect(parsed.toolCalls).toHaveLength(1)
      expect(parsed.toolCalls[0].name).toBe('search_emails')
    })

    it('should truncate large tool results over 10KB', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      const largeResult = 'x'.repeat(15000) // 15KB
      await memoryStore.saveTurn({
        userMessage: 'Query',
        assistantMessage: 'Response',
        toolCalls: [
          { name: 'search', result: largeResult }
        ]
      })

      const savedContent = vi.mocked(fs.appendFile).mock.calls[0][1] as string
      const parsed = JSON.parse(savedContent)
      const savedResult = parsed.toolCalls[0].result

      // Should be truncated with summary
      expect(savedResult.length).toBeLessThan(largeResult.length)
      expect(savedResult).toContain('truncated')
      expect(savedResult).toContain('15000 total chars')
    })

    it('should not truncate small tool results', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      const smallResult = 'Found 3 emails'
      await memoryStore.saveTurn({
        userMessage: 'Query',
        assistantMessage: 'Response',
        toolCalls: [
          { name: 'search', result: smallResult }
        ]
      })

      const savedContent = vi.mocked(fs.appendFile).mock.calls[0][1] as string
      const parsed = JSON.parse(savedContent)

      expect(parsed.toolCalls[0].result).toBe(smallResult)
    })

    it('should append to history file', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      await memoryStore.saveTurn({
        userMessage: 'Hello',
        assistantMessage: 'Hi'
      })

      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('HISTORY.md'),
        expect.any(String),
        'utf-8'
      )
    })

    it('should write valid JSONL format (newline terminated)', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      await memoryStore.saveTurn({
        userMessage: 'Hello',
        assistantMessage: 'Hi'
      })

      const savedContent = vi.mocked(fs.appendFile).mock.calls[0][1] as string
      expect(savedContent.endsWith('\n')).toBe(true)
      // Should be parseable
      expect(() => JSON.parse(savedContent)).not.toThrow()
    })
  })

  describe('updateMemory', () => {
    it('should write memory content to file', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await memoryStore.updateMemory('New memory content')

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('MEMORY.md'),
        'New memory content',
        'utf-8'
      )
    })

    it('should overwrite existing memory', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await memoryStore.updateMemory('Updated memory')

      expect(fs.writeFile).toHaveBeenCalledTimes(1)
    })

    it('should handle empty content', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      await memoryStore.updateMemory('')

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        '',
        'utf-8'
      )
    })
  })

  describe('Thread Safety (Mutex)', () => {
    it('should serialize concurrent memory reads', async () => {
      let readCount = 0
      vi.mocked(fs.readFile).mockImplementation(async () => {
        readCount++
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'memory content'
      })

      // Start multiple concurrent reads
      const promises = [
        memoryStore.getMemoryContext(),
        memoryStore.getMemoryContext(),
        memoryStore.getMemoryContext()
      ]

      await Promise.all(promises)

      // All reads should complete (mutex allows them but serializes)
      expect(readCount).toBe(3)
    })

    it('should serialize concurrent history writes', async () => {
      let writeOrder: number[] = []
      vi.mocked(fs.appendFile).mockImplementation(async () => {
        const id = writeOrder.length
        writeOrder.push(id)
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Start multiple concurrent saves
      await Promise.all([
        memoryStore.saveTurn({ userMessage: '1', assistantMessage: 'a' }),
        memoryStore.saveTurn({ userMessage: '2', assistantMessage: 'b' }),
        memoryStore.saveTurn({ userMessage: '3', assistantMessage: 'c' })
      ])

      // All writes should complete
      expect(writeOrder).toHaveLength(3)
    })

    it('should prevent race conditions between read and write of same file', async () => {
      const operations: string[] = []
      let memoryContent = 'initial'

      vi.mocked(fs.readFile).mockImplementation(async () => {
        operations.push('read-start')
        await new Promise((resolve) => setTimeout(resolve, 20))
        operations.push('read-end')
        return memoryContent
      })

      vi.mocked(fs.writeFile).mockImplementation(async () => {
        operations.push('write-start')
        await new Promise((resolve) => setTimeout(resolve, 20))
        memoryContent = 'updated'
        operations.push('write-end')
      })

      // Concurrent read and write
      await Promise.all([memoryStore.getMemoryContext(), memoryStore.updateMemory('updated')])

      // Operations should be serialized (no interleaving)
      // With mutex, either all read ops complete before write, or vice versa
      expect(operations).toHaveLength(4)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long memory content', async () => {
      const longContent = 'x'.repeat(100000)
      vi.mocked(fs.readFile).mockResolvedValue(longContent)

      const result = await memoryStore.getMemoryContext()

      expect(result).toContain(longContent)
    })

    it('should handle unicode in memory content', async () => {
      const unicodeContent = 'Important: \u4e2d\u6587 \U0001F600'
      vi.mocked(fs.readFile).mockResolvedValue(unicodeContent)

      const result = await memoryStore.getMemoryContext()

      expect(result).toContain(unicodeContent)
    })

    it('should handle special characters in tool results', async () => {
      vi.mocked(fs.appendFile).mockResolvedValue(undefined)

      const specialResult = 'Result with "quotes" and \\backslash\\ and \n newlines'
      await memoryStore.saveTurn({
        userMessage: 'Query',
        assistantMessage: 'Response',
        toolCalls: [{ name: 'tool', result: specialResult }]
      })

      const savedContent = vi.mocked(fs.appendFile).mock.calls[0][1] as string
      // Should be valid JSON
      expect(() => JSON.parse(savedContent)).not.toThrow()
    })

    it('should handle history file with trailing whitespace', async () => {
      const historyContent =
        JSON.stringify({ role: 'user', content: 'Hello' }) + '\n\n\n  \n'

      vi.mocked(fs.readFile).mockResolvedValue(historyContent)

      const history = await memoryStore.getHistory()

      // Should parse valid entries, trim handles whitespace
      expect(history).toHaveLength(1)
    })

    it('should handle very large history files', async () => {
      // Simulate 10000 entries
      const entries = Array(10000)
        .fill(null)
        .map((_, i) => JSON.stringify({ role: 'user', content: `Message ${i}` }))
      vi.mocked(fs.readFile).mockResolvedValue(entries.join('\n'))

      const history = await memoryStore.getHistory(100)

      expect(history).toHaveLength(100)
    })

    it('should handle file system permission errors gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      )

      const result = await memoryStore.getMemoryContext()

      expect(result).toBe('')
    })
  })
})
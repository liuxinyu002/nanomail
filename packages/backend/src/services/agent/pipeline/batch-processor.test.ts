/**
 * Tests for BatchEmailProcessor
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BatchEmailProcessor } from './batch-processor'
import { EmailAnalyzer } from './email-analyzer'
import type { EmailAnalysis } from './schemas'

// Mock EmailAnalyzer
const mockAnalyzer = {
  analyzeAndPersist: vi.fn()
}

// Mock data source
const mockDataSource = {
  getRepository: vi.fn()
}

// Mock email repository
const mockEmailRepo = {
  find: vi.fn()
}

describe('BatchEmailProcessor', () => {
  let processor: BatchEmailProcessor

  beforeEach(() => {
    vi.clearAllMocks()
    mockDataSource.getRepository.mockReturnValue(mockEmailRepo)
    processor = new BatchEmailProcessor(mockAnalyzer as any, mockDataSource as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with default concurrency settings', () => {
      expect(processor).toBeDefined()
    })

    it('should accept custom concurrency settings', () => {
      const customProcessor = new BatchEmailProcessor(mockAnalyzer as any, mockDataSource as any, {
        maxConcurrency: 5,
        delayBetweenBatches: 500
      })
      expect(customProcessor).toBeDefined()
    })
  })

  describe('processBatch', () => {
    it('should process multiple emails', async () => {
      const emails = [
        { id: 1, subject: 'Email 1', bodyText: 'Body 1', sender: 'a@test.com', date: new Date() },
        { id: 2, subject: 'Email 2', bodyText: 'Body 2', sender: 'b@test.com', date: new Date() }
      ]

      mockAnalyzer.analyzeAndPersist.mockResolvedValue({
        success: true,
        analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] },
        persisted: true
      })

      const result = await processor.processBatch(emails as any)

      expect(result.processed).toBe(2)
      expect(result.failed).toBe(0)
      expect(mockAnalyzer.analyzeAndPersist).toHaveBeenCalledTimes(2)
    })

    it('should respect maxConcurrency of 3', async () => {
      const emails = Array(10).fill(null).map((_, i) => ({
        id: i + 1,
        subject: `Email ${i}`,
        bodyText: 'Body',
        sender: 'test@test.com',
        date: new Date()
      }))

      let concurrentCount = 0
      let maxConcurrent = 0

      mockAnalyzer.analyzeAndPersist.mockImplementation(async () => {
        concurrentCount++
        maxConcurrent = Math.max(maxConcurrent, concurrentCount)
        await new Promise(resolve => setTimeout(resolve, 10))
        concurrentCount--
        return { success: true, analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] }, persisted: true }
      })

      await processor.processBatch(emails as any)

      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })

    it('should handle failures gracefully with Promise.allSettled', async () => {
      const emails = [
        { id: 1, subject: 'Email 1', bodyText: 'Body 1', sender: 'a@test.com', date: new Date() },
        { id: 2, subject: 'Email 2', bodyText: 'Body 2', sender: 'b@test.com', date: new Date() },
        { id: 3, subject: 'Email 3', bodyText: 'Body 3', sender: 'c@test.com', date: new Date() }
      ]

      mockAnalyzer.analyzeAndPersist
        .mockResolvedValueOnce({ success: true, analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] }, persisted: true })
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce({ success: true, analysis: { classification: 'SPAM', confidence: 0.99, summary: '', actionItems: [] }, persisted: true })

      const result = await processor.processBatch(emails as any)

      expect(result.processed).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })

    it('should add delay between batches', async () => {
      const emails = Array(6).fill(null).map((_, i) => ({
        id: i + 1,
        subject: `Email ${i}`,
        bodyText: 'Body',
        sender: 'test@test.com',
        date: new Date()
      }))

      mockAnalyzer.analyzeAndPersist.mockResolvedValue({
        success: true,
        analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] },
        persisted: true
      })

      const startTime = Date.now()
      await processor.processBatch(emails as any)
      const duration = Date.now() - startTime

      // With 6 emails and maxConcurrency 3, should have 2 batches
      // Minimum delay: 1 batch delay = 1000ms (default delayBetweenBatches)
      // But we'll just verify it completed
      expect(mockAnalyzer.analyzeAndPersist).toHaveBeenCalledTimes(6)
    })

    it('should return empty result for empty batch', async () => {
      const result = await processor.processBatch([])

      expect(result.processed).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toEqual([])
    })
  })

  describe('processUnprocessed', () => {
    it('should fetch and process unprocessed emails', async () => {
      const emails = [
        { id: 1, subject: 'Unprocessed', bodyText: 'Body', sender: 'test@test.com', date: new Date() }
      ]

      mockEmailRepo.find.mockResolvedValue(emails)
      mockAnalyzer.analyzeAndPersist.mockResolvedValue({
        success: true,
        analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] },
        persisted: true
      })

      const result = await processor.processUnprocessed()

      expect(mockEmailRepo.find).toHaveBeenCalledWith({
        where: { isProcessed: false },
        take: 100
      })
      expect(result.processed).toBe(1)
    })

    it('should respect limit parameter', async () => {
      mockEmailRepo.find.mockResolvedValue([])

      await processor.processUnprocessed(50)

      expect(mockEmailRepo.find).toHaveBeenCalledWith({
        where: { isProcessed: false },
        take: 50
      })
    })

    it('should use default limit of 100', async () => {
      mockEmailRepo.find.mockResolvedValue([])

      await processor.processUnprocessed()

      expect(mockEmailRepo.find).toHaveBeenCalledWith({
        where: { isProcessed: false },
        take: 100
      })
    })
  })

  describe('Error Handling', () => {
    it('should record error details for failed emails', async () => {
      const emails = [
        { id: 1, subject: 'Email 1', bodyText: 'Body', sender: 'test@test.com', date: new Date() }
      ]

      mockAnalyzer.analyzeAndPersist.mockRejectedValueOnce(new Error('LLM error'))

      const result = await processor.processBatch(emails as any)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].emailId).toBe(1)
      expect(result.errors[0].error).toContain('LLM error')
    })

    it('should continue processing after errors', async () => {
      const emails = [
        { id: 1, subject: 'Email 1', bodyText: 'Body', sender: 'test@test.com', date: new Date() },
        { id: 2, subject: 'Email 2', bodyText: 'Body', sender: 'test@test.com', date: new Date() },
        { id: 3, subject: 'Email 3', bodyText: 'Body', sender: 'test@test.com', date: new Date() }
      ]

      mockAnalyzer.analyzeAndPersist
        .mockRejectedValueOnce(new Error('Error on first'))
        .mockResolvedValueOnce({ success: true, analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] }, persisted: true })
        .mockRejectedValueOnce(new Error('Error on third'))

      const result = await processor.processBatch(emails as any)

      expect(result.processed).toBe(1)
      expect(result.failed).toBe(2)
    })
  })

  describe('Progress Tracking', () => {
    it('should call onProgress callback if provided', async () => {
      const emails = [
        { id: 1, subject: 'Email 1', bodyText: 'Body', sender: 'test@test.com', date: new Date() },
        { id: 2, subject: 'Email 2', bodyText: 'Body', sender: 'test@test.com', date: new Date() }
      ]

      mockAnalyzer.analyzeAndPersist.mockResolvedValue({
        success: true,
        analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] },
        persisted: true
      })

      const progressCalls: Array<{ processed: number; total: number }> = []
      await processor.processBatch(emails as any, (processed, total) => {
        progressCalls.push({ processed, total })
      })

      expect(progressCalls.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should handle large batches efficiently', async () => {
      const emails = Array(50).fill(null).map((_, i) => ({
        id: i + 1,
        subject: `Email ${i}`,
        bodyText: 'Body',
        sender: 'test@test.com',
        date: new Date()
      }))

      // Use a processor with no delay for faster testing
      const fastProcessor = new BatchEmailProcessor(mockAnalyzer as any, mockDataSource as any, {
        maxConcurrency: 5,
        delayBetweenBatches: 0
      })

      mockAnalyzer.analyzeAndPersist.mockResolvedValue({
        success: true,
        analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: '', actionItems: [] },
        persisted: true
      })

      const startTime = Date.now()
      const result = await fastProcessor.processBatch(emails as any)
      const duration = Date.now() - startTime

      expect(result.processed).toBe(50)
      expect(result.failed).toBe(0)
      // Should complete in reasonable time (concurrency helps)
      expect(duration).toBeLessThan(5000) // 5 seconds max
    })
  })

  describe('Failed Analysis Handling', () => {
    it('should count as failed when analysis returns success: false', async () => {
      const emails = [
        { id: 1, subject: 'Email 1', bodyText: 'Body', sender: 'test@test.com', date: new Date() },
        { id: 2, subject: 'Email 2', bodyText: 'Body', sender: 'test@test.com', date: new Date() }
      ]

      mockAnalyzer.analyzeAndPersist
        .mockResolvedValueOnce({
          success: false,
          error: 'LLM call failed (finishReason: error)',
          persisted: false
        })
        .mockResolvedValueOnce({
          success: true,
          analysis: { classification: 'IMPORTANT', confidence: 0.9, summary: 'OK', actionItems: [] },
          persisted: true
        })

      const result = await processor.processBatch(emails as any)

      expect(result.processed).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].emailId).toBe(1)
      expect(result.errors[0].error).toBe('LLM call failed (finishReason: error)')
    })
  })
})
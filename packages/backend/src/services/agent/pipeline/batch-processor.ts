/**
 * Batch Email Processor
 * Processes multiple emails with concurrency control and error handling
 */

import type { DataSource } from 'typeorm'
import { EmailAnalyzer, type EmailData } from './email-analyzer'
import { Email } from '../../../entities/Email.entity'

/**
 * Processor configuration options
 */
export interface ProcessorOptions {
  maxConcurrency?: number
  delayBetweenBatches?: number
}

/**
 * Batch processing result
 */
export interface BatchResult {
  processed: number
  failed: number
  errors: Array<{ emailId: number; error: string }>
}

/**
 * Progress callback type
 */
export type ProgressCallback = (processed: number, total: number) => void

/**
 * Batch email processor with concurrency control
 */
export class BatchEmailProcessor {
  private analyzer: EmailAnalyzer
  private dataSource: DataSource
  private maxConcurrency: number
  private delayBetweenBatches: number

  constructor(
    analyzer: EmailAnalyzer,
    dataSource: DataSource,
    options: ProcessorOptions = {}
  ) {
    this.analyzer = analyzer
    this.dataSource = dataSource
    this.maxConcurrency = options.maxConcurrency ?? 3
    this.delayBetweenBatches = options.delayBetweenBatches ?? 1000
  }

  /**
   * Process a batch of emails with concurrency control
   */
  async processBatch(
    emails: EmailData[],
    onProgress?: ProgressCallback
  ): Promise<BatchResult> {
    const result: BatchResult = {
      processed: 0,
      failed: 0,
      errors: []
    }

    if (emails.length === 0) {
      return result
    }

    let processedCount = 0
    const total = emails.length

    // Process in batches with concurrency control
    for (let i = 0; i < emails.length; i += this.maxConcurrency) {
      const batch = emails.slice(i, i + this.maxConcurrency)

      // Process batch concurrently using Promise.allSettled
      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          await this.analyzer.analyzeAndPersist(email)
          return { emailId: email.id, success: true }
        })
      )

      // Collect results using forEach with explicit index for accurate error tracking
      batchResults.forEach((batchResult, index) => {
        if (batchResult.status === 'fulfilled') {
          result.processed++
        } else {
          result.failed++
          // Use explicit index to get the correct email (indexOf can return wrong match)
          const failedEmail = batch[index]
          if (failedEmail) {
            result.errors.push({
              emailId: failedEmail.id,
              error: batchResult.reason?.message || 'Unknown error'
            })
          }
        }
        processedCount++
        onProgress?.(processedCount, total)
      })

      // Add delay between batches (except for the last batch)
      if (i + this.maxConcurrency < emails.length) {
        await this.delay(this.delayBetweenBatches)
      }
    }

    return result
  }

  /**
   * Process all unprocessed emails from the database
   */
  async processUnprocessed(limit = 100, onProgress?: ProgressCallback): Promise<BatchResult> {
    const emailRepo = this.dataSource.getRepository(Email)

    const emails = await emailRepo.find({
      where: { isProcessed: false },
      take: limit
    })

    return this.processBatch(emails as EmailData[], onProgress)
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
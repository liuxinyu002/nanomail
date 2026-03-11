/**
 * Agent Routes - SSE Streaming Endpoints
 * Reference: nanobot/agent/loop.py - on_progress callback pattern
 */

import { Router, Request, Response } from 'express'
import type { DataSource } from 'typeorm'
import { In } from 'typeorm'
import type { LLMProvider } from '../services/llm/types'
import type { ToolRegistry } from '../services/agent/tools/registry'
import type { ContextBuilder } from '../services/agent/context/types'
import type { MemoryStore } from '../services/agent/memory/types'
import type { TokenTruncator } from '../services/agent/utils/token-truncator'
import { AgentLoop } from '../services/agent/loop/agent-loop'
import { EmailAnalyzer, type EmailData } from '../services/agent/pipeline/email-analyzer'
import { BatchEmailProcessor } from '../services/agent/pipeline/batch-processor'
import { Email } from '../entities/Email.entity'

/**
 * Request type for draft generation
 */
export interface DraftRequest {
  emailId: number
  instruction: string
}

/**
 * Request type for process emails
 */
export interface ProcessEmailsRequest {
  emailIds: number[]
}

/**
 * Dependencies for agent routes
 */
export interface AgentRoutesDeps {
  dataSource: DataSource
  llmProvider: LLMProvider
  toolRegistry: ToolRegistry
  contextBuilder: ContextBuilder
  memoryStore: MemoryStore
  tokenTruncator: TokenTruncator
}

/**
 * Creates Express routes for agent operations with SSE streaming.
 */
export function createAgentRoutes(deps: AgentRoutesDeps): Router {
  const router = Router()
  const emailRepository = deps.dataSource.getRepository(Email)

  // Initialize EmailAnalyzer and BatchEmailProcessor
  const emailAnalyzer = new EmailAnalyzer(deps.llmProvider, deps.dataSource)
  const batchProcessor = new BatchEmailProcessor(emailAnalyzer, deps.dataSource, {
    maxConcurrency: 3,
    delayBetweenBatches: 1000
  })

  /**
   * POST /api/agent/draft
   *
   * SSE endpoint for draft generation
   * Streams the agent's thought process and final draft
   */
  router.post('/draft', async (req: Request, res: Response) => {
    const { emailId, instruction } = req.body as DraftRequest

    // Validate input
    if (!emailId) {
      res.status(400).json({ error: 'Missing emailId' })
      return
    }

    if (!instruction) {
      res.status(400).json({ error: 'Missing instruction' })
      return
    }

    // Get email from database
    const email = await emailRepository.findOne({ where: { id: emailId } })
    if (!email) {
      res.status(404).json({ error: `Email with id ${emailId} not found` })
      return
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

    // Create agent loop
    const agentLoop = new AgentLoop({
      provider: deps.llmProvider,
      toolRegistry: deps.toolRegistry,
      contextBuilder: deps.contextBuilder,
      memoryStore: deps.memoryStore,
      tokenTruncator: deps.tokenTruncator,
      config: {
        preset: 'draft'
      }
    })

    try {
      // Run the agent loop and stream events
      for await (const event of agentLoop.run(instruction, email)) {
        // Send SSE event
        res.write(`data: ${JSON.stringify(event)}\n\n`)

        // Flush immediately if supported
        if ('flush' in res && typeof res.flush === 'function') {
          res.flush()
        }
      }
    } catch (error) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`
      )
    }

    res.end()
  })

  /**
   * POST /api/agent/process-emails
   *
   * Queue emails for AI processing (one-shot email analysis)
   * Uses BatchEmailProcessor with concurrency control and rate limiting
   */
  router.post('/process-emails', async (req: Request, res: Response) => {
    const { emailIds } = req.body as ProcessEmailsRequest

    // Validate input
    if (!emailIds || !Array.isArray(emailIds)) {
      res.status(400).json({ error: 'emailIds array is required' })
      return
    }

    if (emailIds.length === 0) {
      res.status(400).json({ error: 'emailIds cannot be empty' })
      return
    }

    // Fetch emails from database
    const emails = await emailRepository.findBy({
      id: In(emailIds)
    })

    if (emails.length === 0) {
      res.status(404).json({ error: 'No emails found with the provided IDs' })
      return
    }

    // Convert to EmailData format for the analyzer
    const emailDataList: EmailData[] = emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      sender: email.sender,
      bodyText: email.bodyText,
      snippet: email.snippet,
      date: email.date
    }))

    try {
      // Process emails using BatchEmailProcessor with concurrency control
      const result = await batchProcessor.processBatch(emailDataList)

      // Format response
      const response = {
        processed: result.processed,
        failed: result.failed,
        results: emailIds.map((id) => {
          const error = result.errors.find((e) => e.emailId === id)
          if (error) {
            return {
              emailId: id,
              status: 'rejected' as const,
              error: error.error
            }
          }
          return {
            emailId: id,
            status: 'fulfilled' as const,
            data: { id, status: 'processed' }
          }
        })
      }

      res.json(response)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error during processing'
      })
    }
  })

  return router
}
/**
 * Agent Routes - SSE Streaming Endpoints
 * Reference: nanobot/agent/loop.py - on_progress callback pattern
 */

import { Router, Request, Response } from 'express'
import type { DataSource } from 'typeorm'
import { In } from 'typeorm'
import { randomUUID } from 'crypto'
import type { LLMProvider } from '../services/llm/base-provider'
import type { ToolRegistry } from '../services/agent/tools/registry'
import type { ContextBuilder } from '../services/agent/context/types'
import type { MemoryStore } from '../services/agent/memory/types'
import { EmailAnalyzer, type EmailData } from '../services/agent/pipeline/email-analyzer'
import { BatchEmailProcessor } from '../services/agent/pipeline/batch-processor'
import { AgentLoop } from '../services/agent/loop/agent-loop'
import { Email } from '../entities/Email.entity'
import { ChatRequestSchema } from '@nanomail/shared'
import { createLogger } from '../config/logger'

const log = createLogger('AgentRoutes')

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

  /**
   * POST /api/agent/chat
   *
   * SSE endpoint for conversational todo management
   * Streams AI thought process, tool calls, and results
   */
  router.post('/chat', async (req: Request, res: Response) => {
    log.info({ body: req.body }, 'Received chat request')

    // Validate input
    const validationResult = ChatRequestSchema.safeParse(req.body)
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validationResult.error.errors
      })
      return
    }

    const { messages, context } = validationResult.data
    log.info({ messageCount: messages.length, context }, 'Chat request validated')

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // CRITICAL: Force flush headers to immediately establish HTTP long connection
    res.flushHeaders()

    // Generate session and message IDs
    const sessionId = randomUUID()
    const messageId = randomUUID()

    // Create AbortController for proper cleanup
    const abortController = new AbortController()
    let closed = false

    // Handle client disconnect
    // Note: In dev mode with Vite proxy, req.on('close') may fire immediately
    // We use a delay to distinguish between proxy behavior and real disconnects
    let streamStarted = false
    let closeTimeout: ReturnType<typeof setTimeout> | null = null

    const handleDisconnect = (source: string) => {
      log.info({ sessionId, source, streamStarted, closed }, 'Disconnect event fired')

      // If stream has already started and we're just getting a late close event, ignore it
      if (streamStarted) {
        log.info({ sessionId, source }, 'Stream already started, ignoring close event')
        return
      }

      // Stream hasn't started yet - wait to confirm if this is a real disconnect
      log.info({ sessionId }, 'Stream not started yet, waiting to confirm disconnect...')
      closeTimeout = setTimeout(() => {
        log.info({ sessionId, closed, streamStarted }, 'Close timeout fired')
        if (!closed && !streamStarted) {
          closed = true
          abortController.abort()
          log.info({ sessionId }, 'Confirmed client disconnect, aborting')
        } else {
          log.info({ sessionId, closed, streamStarted }, 'Close timeout ignored - stream already started or closed')
        }
      }, 500)
      log.info({ sessionId, closeTimeoutSet: !!closeTimeout }, 'Close timeout scheduled')
    }

    req.on('close', () => handleDisconnect('req.close'))
    res.on('close', () => handleDisconnect('res.close'))

    // Cancel pending close timeout when we successfully write data
    const checkAndClearTimeout = () => {
      log.info({ sessionId, closeTimeout: !!closeTimeout, streamStarted }, 'checkAndClearTimeout called')

      // Always set streamStarted to true when we successfully write data
      // This prevents future close events from triggering false disconnects
      streamStarted = true

      if (closeTimeout) {
        clearTimeout(closeTimeout)
        closeTimeout = null
        log.info({ sessionId }, 'Stream started, pending close timeout cleared')
      } else {
        log.info({ sessionId }, 'Stream started, no pending close timeout')
      }
    }

    // Create agent loop with signal for abort support
    const agentLoop = new AgentLoop({
      provider: deps.llmProvider,
      toolRegistry: deps.toolRegistry,
      contextBuilder: deps.contextBuilder,
      memoryStore: deps.memoryStore,
      config: { preset: 'todo' },
      signal: abortController.signal
    })

    try {
      // Send session_start event
      log.info({ sessionId }, 'Writing session_start event')
      res.write(`data: ${JSON.stringify({
        type: 'session_start',
        sessionId,
        messageId,
        timestamp: new Date().toISOString(),
        data: { sessionId, agentRole: 'todo-agent' }
      })}\n\n`)

      // Mark stream as started to prevent false disconnect detection
      log.info({ sessionId }, 'About to call checkAndClearTimeout')
      checkAndClearTimeout()

      // Run agent and stream events
      for await (const event of agentLoop.run(messages, {
        role: 'todo-agent',
        sessionId,
        messageId,
        currentTime: context.currentTime,
        timeZone: context.timeZone,
        sourcePage: context.sourcePage
      })) {
        // Check abort status before each write
        if (abortController.signal.aborted || closed) {
          log.info({ sessionId }, 'Agent loop aborted, stopping stream')
          break
        }

        res.write(`data: ${JSON.stringify(event)}\n\n`)

        // Flush for nginx buffering
        if ('flush' in res && typeof res.flush === 'function') {
          res.flush()
        }
      }
    } catch (error) {
      // Don't send error event if client disconnected
      if (closed || (error instanceof Error && error.name === 'AbortError')) {
        log.info({ sessionId }, 'Agent loop aborted gracefully')
        return
      }

      log.error({ err: error, sessionId }, 'Agent loop error')

      res.write(`data: ${JSON.stringify({
        type: 'error',
        sessionId,
        messageId,
        timestamp: new Date().toISOString(),
        data: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })}\n\n`)
    } finally {
      // Ensure response ends
      if (!closed) {
        res.end()
      }
    }
  })

  return router
}

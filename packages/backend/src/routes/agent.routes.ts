/**
 * Agent Routes - SSE Streaming Endpoints
 * Reference: nanobot/agent/loop.py - on_progress callback pattern
 */

import { Router, Request, Response } from 'express'
import type { DataSource } from 'typeorm'
import type { LLMProvider } from '../services/llm/types'
import type { ToolRegistry } from '../services/agent/tools/registry'
import type { ContextBuilder } from '../services/agent/context/types'
import type { MemoryStore } from '../services/agent/memory/types'
import type { TokenTruncator } from '../services/agent/utils/token-truncator'
import { AgentLoop } from '../services/agent/loop/agent-loop'
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

    // Process emails
    const results = await Promise.allSettled(
      emailIds.map(async (id) => {
        const email = await emailRepository.findOne({ where: { id } })
        if (!email) {
          throw new Error(`Email ${id} not found`)
        }

        // For now, just mark as processed
        // In full implementation, this would trigger the EmailAnalyzer
        email.isProcessed = true
        await emailRepository.save(email)

        return { id, status: 'processed' }
      })
    )

    res.json({
      processed: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
      results: results.map((r, i) => ({
        emailId: emailIds[i],
        status: r.status,
        ...(r.status === 'fulfilled'
          ? { data: (r as PromiseFulfilledResult<{ id: number; status: string }>).value }
          : { error: (r as PromiseRejectedResult).reason instanceof Error
              ? (r as PromiseRejectedResult).reason.message
              : String((r as PromiseRejectedResult).reason) })
      }))
    })
  })

  return router
}
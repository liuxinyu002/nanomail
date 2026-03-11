/**
 * Email Analyzer Service
 * Analyzes emails using LLM for classification, summarization, and action item extraction
 */

import type { DataSource } from 'typeorm'
import type { ChatParams } from '../../llm/types'
import { EmailAnalysisSchema, type EmailAnalysis, type ActionItem } from './schemas'
import { Email } from '../../../entities/Email.entity'
import { Todo } from '../../../entities/Todo.entity'

/**
 * LLM Provider interface for dependency injection
 */
export interface LLMProvider {
  complete(params: ChatParams): Promise<{
    content: string | null
    toolCalls: unknown[]
    finishReason: string
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  }>
}

/**
 * Email data for analysis
 */
export interface EmailData {
  id: number
  subject: string | null
  sender: string | null
  bodyText: string | null
  snippet: string | null
  date: Date
}

/**
 * Default fallback analysis when LLM fails
 */
const DEFAULT_ANALYSIS: EmailAnalysis = {
  classification: 'IMPORTANT',
  confidence: 0.5,
  summary: '',
  actionItems: []
}

/**
 * Email analyzer that uses LLM for intelligent email processing
 */
export class EmailAnalyzer {
  private llmProvider: LLMProvider
  private dataSource: DataSource

  constructor(llmProvider: LLMProvider, dataSource: DataSource) {
    this.llmProvider = llmProvider
    this.dataSource = dataSource
  }

  /**
   * Analyze an email and return classification, summary, and action items
   */
  async analyze(email: EmailData): Promise<EmailAnalysis> {
    try {
      const messages = this.buildPrompt(email)

      const response = await this.llmProvider.complete({
        messages,
        temperature: 0.3,
        maxTokens: 500
      })

      if (!response.content) {
        // Log for observability
        console.warn('Email analysis: LLM returned empty content', { emailId: email.id })
        return DEFAULT_ANALYSIS
      }

      // Parse JSON from response
      const parsed = this.parseJSON(response.content)

      // Validate with Zod schema
      const validationResult = EmailAnalysisSchema.safeParse(parsed)

      if (!validationResult.success) {
        // Log validation errors for debugging
        console.warn('Email analysis: Zod validation failed', {
          emailId: email.id,
          errors: validationResult.error.errors
        })
        return DEFAULT_ANALYSIS
      }

      return validationResult.data
    } catch (error) {
      // Log for observability but still return safe fallback
      console.error('Email analysis failed:', {
        emailId: email.id,
        error: error instanceof Error ? error.message : String(error)
      })
      return DEFAULT_ANALYSIS
    }
  }

  /**
   * Persist analysis results to database
   * Uses transaction to ensure atomicity of email update and todo creation
   */
  async persistResults(email: EmailData, analysis: EmailAnalysis): Promise<void> {
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      const emailRepo = transactionalEntityManager.getRepository(Email)
      const todoRepo = transactionalEntityManager.getRepository(Todo)

      // Update email with analysis results
      await emailRepo.update(
        { id: email.id },
        {
          isSpam: analysis.classification === 'SPAM',
          isProcessed: true
        }
      )

      // Create todos for action items (only for IMPORTANT classification)
      if (analysis.classification === 'IMPORTANT' && analysis.actionItems.length > 0) {
        for (const item of analysis.actionItems) {
          const todo = new Todo()
          todo.emailId = email.id
          todo.description = item.description
          todo.urgency = this.mapUrgency(item.urgency)
          todo.status = 'pending'

          await todoRepo.save(todo)
        }
      }
    })
  }

  /**
   * Analyze and persist in one operation
   */
  async analyzeAndPersist(email: EmailData): Promise<{ analysis: EmailAnalysis }> {
    const analysis = await this.analyze(email)
    await this.persistResults(email, analysis)
    return { analysis }
  }

  /**
   * Build the prompt for LLM analysis
   */
  buildPrompt(email: EmailData): Array<{ role: string; content: string }> {
    const systemPrompt = `You are an email analysis assistant. Analyze emails and classify them.

Your task is to:
1. Classify the email as one of: SPAM, NEWSLETTER, or IMPORTANT
2. Provide a confidence score between 0 and 1
3. Write a brief summary (max 300 chars) - leave empty for SPAM/NEWSLETTER
4. Extract action items if any

Respond ONLY with valid JSON in this exact format:
{
  "classification": "SPAM" | "NEWSLETTER" | "IMPORTANT",
  "confidence": 0.0-1.0,
  "summary": "brief summary",
  "actionItems": [
    {
      "description": "task description",
      "urgency": "HIGH" | "MEDIUM" | "LOW",
      "deadline": "YYYY-MM-DD" or null
    }
  ]
}

Classification guidelines:
- SPAM: Unsolicited promotional or malicious content
- NEWSLETTER: Subscription-based updates, marketing emails
- IMPORTANT: Personal or work emails requiring attention

Do NOT include any text outside the JSON object.`

    const dateStr = email.date instanceof Date ? email.date.toISOString().split('T')[0] : String(email.date)

    const userContent = `Analyze this email:

From: ${email.sender || 'Unknown'}
Subject: ${email.subject || '(No subject)'}
Date: ${dateStr}

<email>
${email.bodyText || email.snippet || '(No content)'}
</email>

Respond with JSON only.`

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]
  }

  /**
   * Parse JSON from LLM response, handling markdown code blocks
   */
  private parseJSON(content: string): unknown {
    // Remove markdown code blocks if present
    let cleaned = content.trim()

    // Handle ```json ... ``` blocks
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      cleaned = jsonMatch[1].trim()
    }

    return JSON.parse(cleaned)
  }

  /**
   * Map urgency from schema format to entity format
   */
  private mapUrgency(urgency: 'HIGH' | 'MEDIUM' | 'LOW'): 'high' | 'medium' | 'low' {
    const mapping: Record<'HIGH' | 'MEDIUM' | 'LOW', 'high' | 'medium' | 'low'> = {
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    }
    return mapping[urgency]
  }
}
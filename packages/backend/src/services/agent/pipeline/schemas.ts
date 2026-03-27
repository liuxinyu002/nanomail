/**
 * Pipeline Schemas
 * Zod schemas for email analysis and action items
 */

import { z } from 'zod'

/**
 * Action item schema for extracted tasks
 */
export const ActionItemSchema = z.object({
  description: z.string(),
  urgency: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable()
})

/**
 * Email classification types
 */
export type EmailClassification = 'SPAM' | 'NEWSLETTER' | 'IMPORTANT'

/**
 * Email analysis schema for LLM response
 * Pure data structure - no failure flag (failures handled via Result type)
 */
export const EmailAnalysisSchema = z.object({
  classification: z.enum(['SPAM', 'NEWSLETTER', 'IMPORTANT']),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(300),
  actionItems: z.array(ActionItemSchema)
})

/**
 * Type exports for use in other modules
 */
export type ActionItem = z.infer<typeof ActionItemSchema>
export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>
import { z } from 'zod'

/**
 * Email classification types from LLM analysis
 */
export const EmailClassificationSchema = z.enum(['IMPORTANT', 'NEWSLETTER', 'SPAM'])
export type EmailClassification = z.infer<typeof EmailClassificationSchema>

/**
 * Schema for Email entity
 */
export const EmailSchema = z.object({
  id: z.number().int().positive(),
  subject: z.string().max(500).nullable(),
  sender: z.string().email().max(255).nullable(),
  snippet: z.string().max(200).nullable(),
  bodyText: z.string().nullable(),
  hasAttachments: z.boolean(),
  date: z.coerce.date(),
  isProcessed: z.boolean(),
  classification: EmailClassificationSchema,
  summary: z.string().max(500).nullable()
})

/**
 * Schema for email list item (API response)
 * Includes dynamically computed isSpam field for backward compatibility
 */
export const EmailListItemSchema = EmailSchema.extend({
  isSpam: z.boolean() // Dynamically computed: classification === 'SPAM'
})

/**
 * Schema for creating a new Email
 */
export const CreateEmailSchema = EmailSchema.omit({
  id: true,
  isProcessed: true,
  classification: true,
  summary: true
}).extend({
  isProcessed: z.boolean().optional().default(false),
  classification: EmailClassificationSchema.optional().default('IMPORTANT'),
  summary: z.string().max(500).nullable().optional()
})

/**
 * Schema for Label entity
 */
export const LabelSchema = z.object({
  id: z.number().int().positive(),
  emailId: z.number().int().positive(),
  name: z.string().min(1).max(100)
})

/**
 * Schema for creating a new Label
 */
export const CreateLabelSchema = LabelSchema.omit({ id: true })

/**
 * Schema for well-known label names
 */
export const LabelNameSchema = z.enum([
  'newsletter',
  'spam',
  'important',
  'work',
  'personal',
  'finance',
  'travel',
  'shopping'
])

/**
 * Email with related labels
 */
export const EmailWithLabelsSchema = EmailSchema.extend({
  labels: z.array(LabelSchema)
})

/**
 * Sync job status enum
 */
export const SyncJobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed'])

/**
 * Schema for SyncJob - tracks async email sync operations
 */
export const SyncJobSchema = z.object({
  id: z.string().uuid(),
  accountId: z.number().int().positive(),
  status: SyncJobStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  result: z.object({
    syncedCount: z.number().int().nonnegative(),
    errors: z.array(z.string()),
  }).optional(),
  error: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

/**
 * Schema for creating a new SyncJob
 */
export const CreateSyncJobSchema = SyncJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * Schema for job creation response
 */
export const SyncJobResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: SyncJobStatusSchema,
})

export type SyncJobStatus = z.infer<typeof SyncJobStatusSchema>
export type SyncJob = z.infer<typeof SyncJobSchema>
export type CreateSyncJob = z.infer<typeof CreateSyncJobSchema>
export type SyncJobResponse = z.infer<typeof SyncJobResponseSchema>

export type Email = z.infer<typeof EmailSchema>
export type EmailListItem = z.infer<typeof EmailListItemSchema>
export type CreateEmail = z.infer<typeof CreateEmailSchema>
export type Label = z.infer<typeof LabelSchema>
export type CreateLabel = z.infer<typeof CreateLabelSchema>
export type LabelName = z.infer<typeof LabelNameSchema>
export type EmailWithLabels = z.infer<typeof EmailWithLabelsSchema>
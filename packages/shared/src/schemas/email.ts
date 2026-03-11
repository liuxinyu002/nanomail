import { z } from 'zod'

/**
 * Schema for Email entity
 */
export const EmailSchema = z.object({
  id: z.number().int().positive(),
  subject: z.string().max(500),
  sender: z.string().email().max(255),
  snippet: z.string().max(200),
  bodyText: z.string(),
  hasAttachments: z.boolean(),
  date: z.coerce.date(),
  isProcessed: z.boolean(),
  isSpam: z.boolean()
})

/**
 * Schema for creating a new Email
 */
export const CreateEmailSchema = EmailSchema.omit({
  id: true,
  isProcessed: true,
  isSpam: true
}).extend({
  isProcessed: z.boolean().optional().default(false),
  isSpam: z.boolean().optional().default(false)
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

export type Email = z.infer<typeof EmailSchema>
export type CreateEmail = z.infer<typeof CreateEmailSchema>
export type Label = z.infer<typeof LabelSchema>
export type CreateLabel = z.infer<typeof CreateLabelSchema>
export type LabelName = z.infer<typeof LabelNameSchema>
export type EmailWithLabels = z.infer<typeof EmailWithLabelsSchema>
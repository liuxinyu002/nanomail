import { z } from 'zod'

/**
 * Schema for Settings key-value store
 * Value is stored encrypted in database (IV:AuthTag:Ciphertext format)
 */
export const SettingsSchema = z.object({
  id: z.number().int().positive(),
  key: z.string().min(1).max(255),
  value: z.string() // Encrypted compound string
})

/**
 * Schema for creating a new setting
 */
export const CreateSettingsSchema = SettingsSchema.omit({ id: true })

/**
 * Schema for setting keys (well-known configuration keys)
 */
export const SettingKeySchema = z.enum([
  'IMAP_HOST',
  'IMAP_PORT',
  'IMAP_USER',
  'IMAP_PASS',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'LLM_API_KEY',
  'LLM_BASE_URL',
  'LLM_MODEL'
])

export type Settings = z.infer<typeof SettingsSchema>
export type CreateSettings = z.infer<typeof CreateSettingsSchema>
export type SettingKey = z.infer<typeof SettingKeySchema>
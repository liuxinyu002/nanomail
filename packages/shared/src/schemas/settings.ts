import { z } from 'zod'

/**
 * Protocol type for receiving emails
 */
export const ProtocolTypeSchema = z.enum(['IMAP', 'POP3'])

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
  // Protocol selection
  'PROTOCOL_TYPE',
  // IMAP
  'IMAP_HOST',
  'IMAP_PORT',
  'IMAP_USER',
  'IMAP_PASS',
  // POP3
  'POP3_HOST',
  'POP3_PORT',
  'POP3_USER',
  'POP3_PASS',
  // SMTP
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  // LLM
  'LLM_API_KEY',
  'LLM_BASE_URL',
  'LLM_MODEL'
])

/**
 * Schema for the settings form used in frontend
 * This represents the structured settings object
 */
export const SettingsFormSchema = z.object({
  // Protocol type
  PROTOCOL_TYPE: ProtocolTypeSchema,

  // IMAP
  IMAP_HOST: z.string(),
  IMAP_PORT: z.string(),
  IMAP_USER: z.string(),
  IMAP_PASS: z.string(),

  // POP3
  POP3_HOST: z.string(),
  POP3_PORT: z.string(),
  POP3_USER: z.string(),
  POP3_PASS: z.string(),

  // SMTP
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),

  // LLM
  LLM_API_KEY: z.string(),
  LLM_MODEL: z.string(),
  LLM_BASE_URL: z.string()
})

/**
 * Default settings values
 */
export const defaultSettings: SettingsForm = {
  PROTOCOL_TYPE: 'IMAP',
  IMAP_HOST: '',
  IMAP_PORT: '',
  IMAP_USER: '',
  IMAP_PASS: '',
  POP3_HOST: '',
  POP3_PORT: '',
  POP3_USER: '',
  POP3_PASS: '',
  SMTP_HOST: '',
  SMTP_PORT: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  LLM_API_KEY: '',
  LLM_MODEL: '',
  LLM_BASE_URL: ''
}

export type ProtocolType = z.infer<typeof ProtocolTypeSchema>
export type Settings = z.infer<typeof SettingsSchema>
export type CreateSettings = z.infer<typeof CreateSettingsSchema>
export type SettingKey = z.infer<typeof SettingKeySchema>
export type SettingsForm = z.infer<typeof SettingsFormSchema>
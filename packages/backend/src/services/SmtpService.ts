import nodemailer from 'nodemailer'
import type { SettingsService } from './SettingsService'
import { createLogger, type Logger } from '../config/logger.js'

/**
 * SMTP configuration retrieved from SettingsService
 */
export interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
  secure: boolean
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  replyTo?: string
  isHtml?: boolean
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Result of SMTP connection test
 */
export interface SmtpConnectionResult {
  success: boolean
  error?: string
}

/**
 * Setting keys required for SMTP configuration
 */
const SMTP_SETTINGS = {
  HOST: 'SMTP_HOST',
  PORT: 'SMTP_PORT',
  USER: 'SMTP_USER',
  PASSWORD: 'SMTP_PASSWORD',
} as const

/**
 * SmtpService provides email sending capabilities using nodemailer.
 *
 * Responsibilities:
 * - Connect to SMTP server using encrypted credentials from SettingsService
 * - Send emails with plain text or HTML body
 * - Verify connection and handle errors
 */
export class SmtpService {
  private readonly log: Logger = createLogger('SmtpService')

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Retrieves SMTP configuration from settings.
   *
   * @returns SmtpConfig object with decrypted credentials
   * @throws Error if any required setting is missing
   */
  async getConfig(): Promise<SmtpConfig> {
    const host = await this.settingsService.get(SMTP_SETTINGS.HOST)
    const portStr = await this.settingsService.get(SMTP_SETTINGS.PORT)
    const user = await this.settingsService.get(SMTP_SETTINGS.USER)
    const password = await this.settingsService.get(SMTP_SETTINGS.PASSWORD)

    if (!host) {
      throw new Error('SMTP_HOST is not configured')
    }

    if (!user) {
      throw new Error('SMTP_USER is not configured')
    }

    if (!password) {
      throw new Error('SMTP_PASSWORD is not configured')
    }

    const port = portStr ? parseInt(portStr, 10) : 587

    return {
      host,
      port,
      user,
      password,
      secure: port === 465,
    }
  }

  /**
   * Creates a nodemailer transporter with the given configuration.
   */
  private async createTransporter() {
    const config = await this.getConfig()

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    })
  }

  /**
   * Tests connection to SMTP server.
   *
   * @returns SmtpConnectionResult indicating success or failure
   */
  async testConnection(): Promise<SmtpConnectionResult> {
    try {
      const transporter = await this.createTransporter()
      await transporter.verify()
      this.log.info('SMTP connection test successful')
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
      this.log.error({ err: error }, 'SMTP connection test failed')
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Sends an email.
   *
   * @param options - Email options (to, subject, body, etc.)
   * @returns SendEmailResult with success status and message ID
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    this.log.info({ to: options.to, subject: options.subject }, 'Starting email send')

    try {
      const config = await this.getConfig()
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
      })

      this.log.info({ host: config.host }, 'SMTP server connected')

      const mailOptions = {
        from: config.user,
        to: options.to,
        subject: options.subject,
        [options.isHtml ? 'html' : 'text']: options.body,
        ...(options.replyTo && { replyTo: options.replyTo }),
      }

      const result = await transporter.sendMail(mailOptions)

      this.log.info({ messageId: result.messageId }, 'Email sent successfully')

      return {
        success: true,
        messageId: result.messageId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown send error'
      this.log.error({ err: error }, 'Email send failed')
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}
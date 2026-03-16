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
  requireTLS?: boolean    // Port 587: STARTTLS upgrade
  ignoreTLS?: boolean     // Port 25: No TLS requirement
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  to: string[]
  cc?: string[]
  bcc?: string[]
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
  PASSWORD: 'SMTP_PASS',
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
      throw new Error('SMTP_PASS is not configured')
    }

    // Port parsing with NaN fallback to default 587
    const parsedPort = portStr ? parseInt(portStr, 10) : 587
    const port = !isNaN(parsedPort) ? parsedPort : 587

    // Port-specific TLS configuration
    // - Port 465: Implicit TLS (secure: true)
    // - Port 587: STARTTLS upgrade (requireTLS: true)
    // - Port 25: Traditional SMTP, no TLS requirement (ignoreTLS: true)
    const secure = port === 465
    const requireTLS = port === 587 || (port !== 465 && port !== 25) ? true : undefined
    const ignoreTLS = port === 25 ? true : undefined

    return {
      host,
      port,
      user,
      password,
      secure,
      requireTLS,
      ignoreTLS,
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
      requireTLS: config.requireTLS,
      ignoreTLS: config.ignoreTLS,
      auth: {
        user: config.user,
        pass: config.password,
      },
      // Connection pool configuration for high-concurrency scenarios
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Timeout configuration
      connectionTimeout: 30000,  // 30s connection timeout
      socketTimeout: 30000,      // 30s socket timeout
      greetingTimeout: 10000,    // 10s greeting timeout
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

    let config: SmtpConfig | undefined
    try {
      config = await this.getConfig()
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: config.requireTLS,
        ignoreTLS: config.ignoreTLS,
        auth: {
          user: config.user,
          pass: config.password,
        },
        // Connection pool configuration
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        // Timeout configuration
        connectionTimeout: 30000,
        socketTimeout: 30000,
        greetingTimeout: 10000,
      })

      this.log.info({ host: config.host }, 'SMTP server connected')

      // CRITICAL: Only include cc/bcc headers if array exists AND has elements
      // Empty string in cc/bcc headers can cause SMTP errors with strict servers (e.g., Microsoft Exchange)
      const mailOptions = {
        from: config.user,
        to: options.to.join(', '),
        // Only include cc if it exists and has elements
        ...(options.cc && options.cc.length > 0 ? { cc: options.cc.join(', ') } : {}),
        // Only include bcc if it exists and has elements
        ...(options.bcc && options.bcc.length > 0 ? { bcc: options.bcc.join(', ') } : {}),
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

      // Enhanced error logging with input values and configuration
      this.log.error({
        err: error,
        input: {
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          isHtml: options.isHtml,
        },
        config: config ? {
          host: config.host,
          port: config.port,
          secure: config.secure,
          requireTLS: config.requireTLS,
          ignoreTLS: config.ignoreTLS,
          user: config.user,
        } : undefined,
      }, 'Email send failed')

      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}
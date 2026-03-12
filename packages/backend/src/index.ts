import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from project root (monorepo root)
config({ path: resolve(__dirname, '../../../.env') })

import 'reflect-metadata'
import express from 'express'
import cors from 'cors'
import { initializeDatabase, closeDatabase, AppDataSource } from './config/database.js'
import { logger } from './config/logger.js'
import { EncryptionService } from './services/EncryptionService.js'
import { SettingsService } from './services/SettingsService.js'
import { ImapService } from './services/ImapService.js'
import { MailParserService } from './services/MailParserService.js'
import { EmailSyncService } from './services/EmailSyncService.js'
import { SmtpService } from './services/SmtpService.js'
import { JobService } from './services/JobService.js'
import { AsyncSyncExecutor } from './services/AsyncSyncExecutor.js'
import { createEmailRoutes, createTodoRoutes, createSettingsRoutes } from './routes/index.js'

export const APP_VERSION = '0.1.0'

export function getAppInfo(): string {
  return `Smart Email Agent v${APP_VERSION}`
}

/**
 * Application services container
 */
export interface AppServices {
  encryptionService: EncryptionService
  settingsService: SettingsService
  imapService: ImapService
  mailParserService: MailParserService
  emailSyncService: EmailSyncService
  smtpService: SmtpService
  jobService: JobService
  asyncSyncExecutor: AsyncSyncExecutor
}

/**
 * Creates and configures the Express application
 */
export async function createApp(): Promise<{
  app: express.Application
  services: AppServices
}> {
  // Initialize database
  await initializeDatabase()

  // Create services
  const encryptionService = new EncryptionService()
  const settingsService = new SettingsService(
    encryptionService,
    AppDataSource.getRepository('Settings')
  )
  const imapService = new ImapService(settingsService)
  const mailParserService = new MailParserService()
  const emailSyncService = new EmailSyncService(
    AppDataSource,
    settingsService,
    mailParserService
  )
  const smtpService = new SmtpService(settingsService)
  const jobService = new JobService()
  const asyncSyncExecutor = new AsyncSyncExecutor(emailSyncService, jobService)

  const services: AppServices = {
    encryptionService,
    settingsService,
    imapService,
    mailParserService,
    emailSyncService,
    smtpService,
    jobService,
    asyncSyncExecutor,
  }

  // Create Express app
  const app = express()

  // Middleware
  app.use(cors())
  app.use(express.json())

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    })
  })

  // API routes
  app.use('/api/emails', createEmailRoutes(
    AppDataSource,
    emailSyncService,
    jobService,
    asyncSyncExecutor
  ))
  app.use('/api/todos', createTodoRoutes(AppDataSource))
  app.use('/api/settings', createSettingsRoutes(settingsService))

  // Error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error({ err }, 'Unhandled error')
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
      })
    }
  )

  return { app, services }
}

/**
 * Starts the server
 */
export async function startServer(port: number = 3000): Promise<void> {
  const { app, services } = await createApp()

  // Start email sync polling (every 5 minutes)
  services.emailSyncService.startPolling(5)

  const server = app.listen(port, () => {
    logger.info({ port }, 'Server started')
    logger.info({ url: `http://localhost:${port}/health` }, 'Health check available')
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...')
    services.emailSyncService.stopPolling()
    server.close()
    await closeDatabase()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down...')
    services.emailSyncService.stopPolling()
    server.close()
    await closeDatabase()
    process.exit(0)
  })
}

// Start server if run directly
if (require.main === module) {
  startServer(parseInt(process.env.PORT || '3000', 10)).catch((error) => {
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  })
}
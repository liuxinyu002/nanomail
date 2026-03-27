// Bootstrap is imported by logger.ts to load .env before any config is read
import 'reflect-metadata'
import express from 'express'
import cors from 'cors'
import { promises as fs } from 'fs'
import path from 'path'
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
import { createEmailRoutes, createTodoRoutes, createSettingsRoutes, createAgentRoutes, createBoardColumnRoutes } from './routes/index.js'
import { LiteLLMProvider } from './services/llm/litellm-provider.js'
import type { LLMConfig } from './services/llm/types.js'
import { ToolRegistry } from './services/agent/tools/registry.js'
import { ContextBuilder } from './services/agent/context/types.js'
import { MemoryStore } from './services/agent/memory/types.js'
import { SearchEmailsTool } from './services/agent/tools/search-emails.js'
import { SettingKeySchema } from '@nanomail/shared'

/**
 * Get workspace path for agent memory and context
 */
function getWorkspacePath(): string {
  // In production, use a dedicated workspace directory
  // In development, use current working directory
  return process.env.WORKSPACE_PATH || process.cwd()
}

export const APP_VERSION = '0.1.0'

export function getAppInfo(): string {
  return `Smart Email Agent v${APP_VERSION}`
}

/**
 * Load and cache prompt files at startup
 * This avoids file I/O on every request
 */
async function loadAndCachePrompts(contextBuilder: ContextBuilder): Promise<void> {
  const promptsDir = process.env.PROMPTS_DIR ?? path.resolve(__dirname, 'services/agent/prompts')
  const todoAgentPath = path.join(promptsDir, 'todo-agent.md')

  try {
    const todoAgentPrompt = await fs.readFile(todoAgentPath, 'utf-8')
    contextBuilder.setCachedPrompt('todo-agent', todoAgentPrompt)
    logger.info({ path: todoAgentPath }, 'Todo agent prompt loaded and cached')
  } catch (error) {
    logger.warn({ err: error, path: todoAgentPath }, 'Failed to load todo-agent.md, will fall back to ContextBuilder file loading')
  }
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
  console.log('[Backend createApp] Starting initialization...')

  // Initialize database
  console.log('[Backend createApp] Initializing database...')
  try {
    await initializeDatabase()
    console.log('[Backend createApp] Database initialized successfully')
  } catch (error) {
    console.error('[Backend createApp] Database initialization failed:', error)
    throw error
  }

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
    asyncSyncExecutor,
    smtpService
  ))
  app.use('/api/todos', createTodoRoutes(AppDataSource))
  app.use('/api/board-columns', createBoardColumnRoutes(AppDataSource))
  app.use('/api/settings', createSettingsRoutes(settingsService, {
    onLLMConfigChanged: () => {
      configCache.timestamp = 0
    }
  }))

  // Initialize agent services
  const workspacePath = getWorkspacePath()
  const memoryStore = new MemoryStore(workspacePath)
  // ContextBuilder uses prompts directory (configs/prompts by default)
  const contextBuilder = new ContextBuilder()

  // ToolRegistry: dependencies injected at initialization
  const toolRegistry = new ToolRegistry({
    dataSource: AppDataSource,
    defaultColumnId: 1
  })

  // Load and cache prompt files at startup
  await loadAndCachePrompts(contextBuilder)

  // Register search emails tool (todo tools are registered in constructor)
  const searchEmailsTool = SearchEmailsTool.fromDataSource(AppDataSource)
  toolRegistry.register(searchEmailsTool)

  // Create LLM provider with dynamic config getter
  // Uses TTL cache to avoid DB queries on every LLM call
  const configCache = {
    data: null as LLMConfig | null,
    timestamp: 0,
    ttl: 60_000 // 1 minute cache
  }

  const llmProvider = new LiteLLMProvider({
    getConfig: async () => {
      const now = Date.now()
      if (configCache.data && (now - configCache.timestamp) < configCache.ttl) {
        return configCache.data
      }
      const config: LLMConfig = {
        apiKey: await settingsService.get(SettingKeySchema.Enum.LLM_API_KEY),
        apiBase: await settingsService.get(SettingKeySchema.Enum.LLM_BASE_URL),
        model: await settingsService.get(SettingKeySchema.Enum.LLM_MODEL)
      }
      configCache.data = config
      configCache.timestamp = now
      return config
    },
    // Static fallback from environment
    apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY,
    apiBase: process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL,
    defaultModel: process.env.LLM_MODEL || 'gpt-4o-mini'
  })

  // Mount agent routes
  app.use('/api/agent', createAgentRoutes({
    dataSource: AppDataSource,
    llmProvider,
    toolRegistry,
    contextBuilder,
    memoryStore
  }))

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
  console.log('[Backend startServer] Starting server on port:', port)
  const { app, services } = await createApp()

  console.log('[Backend startServer] App created, starting email sync polling...')
  // Start email sync polling (every 5 minutes)
  services.emailSyncService.startPolling(5)

  console.log('[Backend startServer] Starting HTTP server...')
  const server = app.listen(port, () => {
    console.log('[Backend startServer] Server is now listening on port:', port)
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
  console.log('[Backend Main] Starting server...')
  console.log('[Backend Main] NODE_ENV:', process.env.NODE_ENV)
  console.log('[Backend Main] USER_DATA_PATH:', process.env.USER_DATA_PATH)
  console.log('[Backend Main] PORT:', process.env.PORT)
  console.log('[Backend Main] __dirname:', __dirname)
  console.log('[Backend Main] cwd:', process.cwd())

  startServer(parseInt(process.env.PORT || '3000', 10)).catch((error) => {
    console.error('[Backend Main] Failed to start server:', error)
    logger.error({ err: error }, 'Failed to start server')
    process.exit(1)
  })
}
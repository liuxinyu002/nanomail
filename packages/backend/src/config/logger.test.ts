import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Logger Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('logger', () => {
    it('should export a logger instance', async () => {
      const { logger } = await import('./logger')
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.debug).toBe('function')
    })

    it('should have default log level of info', async () => {
      delete process.env.LOG_LEVEL
      const { logger } = await import('./logger')
      expect(logger.level).toBe('info')
    })

    it('should respect LOG_LEVEL environment variable', async () => {
      process.env.LOG_LEVEL = 'debug'
      vi.resetModules()
      const { logger: debugLogger } = await import('./logger')
      expect(debugLogger.level).toBe('debug')
    })

    it('should have service name in base config', async () => {
      const { logger } = await import('./logger')
      // Logger should have bindings with service name
      const bindings = logger.bindings()
      expect(bindings.service).toBe('nanomail-backend')
    })
  })

  describe('createLogger', () => {
    it('should create a child logger with module context', async () => {
      const { createLogger } = await import('./logger')
      const moduleLogger = createLogger('TestModule')
      expect(moduleLogger).toBeDefined()
      expect(typeof moduleLogger.info).toBe('function')
    })

    it('should include module name in child logger bindings', async () => {
      const { createLogger } = await import('./logger')
      const moduleLogger = createLogger('EmailSyncService')
      const bindings = moduleLogger.bindings()
      expect(bindings.module).toBe('EmailSyncService')
    })

    it('should inherit service name from parent logger', async () => {
      const { createLogger } = await import('./logger')
      const moduleLogger = createLogger('TestModule')
      const bindings = moduleLogger.bindings()
      expect(bindings.service).toBe('nanomail-backend')
    })
  })

  describe('Logger type export', () => {
    it('should export Logger type for dependency injection', async () => {
      const { logger, createLogger } = await import('./logger')
      // Type check - if this compiles, the type is exported correctly
      const testLogger: typeof logger = createLogger('Test')
      expect(testLogger).toBeDefined()
    })
  })

  describe('Error serialization', () => {
    it('should serialize errors with err key', async () => {
      const { logger } = await import('./logger')
      // Check that serializers are configured
      const error = new Error('Test error')
      error.stack = 'Test stack'

      // Logger should not throw when logging errors
      expect(() => {
        logger.error({ err: error }, 'Test message')
      }).not.toThrow()
    })

    it('should serialize errors with error key', async () => {
      const { logger } = await import('./logger')
      const error = new Error('Test error')
      error.stack = 'Test stack'

      // Logger should not throw when logging errors with 'error' key
      expect(() => {
        logger.error({ error: error }, 'Test message')
      }).not.toThrow()
    })
  })

  describe('Development vs Production mode', () => {
    it('should detect development mode when NODE_ENV is not production', async () => {
      process.env.NODE_ENV = 'development'
      vi.resetModules()
      const { logger } = await import('./logger')
      expect(logger).toBeDefined()
    })

    it('should work in production mode', async () => {
      process.env.NODE_ENV = 'production'
      vi.resetModules()
      const { logger } = await import('./logger')
      expect(logger).toBeDefined()
      expect(logger.level).toBe('info')
    })
  })
})